import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

interface RequestBody {
  chunks?: Array<{ contentHash?: unknown }>;
  deviceCode?: unknown;
}

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    sendJson(response, 500, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Mimir cloud API listening on ${host}:${port}`);
});

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const path = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;

  if (method === "GET" && (path === "/" || path === "/health")) {
    sendJson(response, 200, {
      name: "mimir",
      status: "ok",
    });
    return;
  }

  if (method === "POST" && path === "/v1/auth/device/start") {
    const deviceCode = randomUUID();
    sendJson(response, 200, {
      deviceCode,
      userCode: deviceCode.slice(0, 8).toUpperCase(),
      verificationUri: process.env.MIMIR_VERIFICATION_URI ?? "https://mimir.cloud/device",
      interval: 5,
      expiresIn: 900,
    });
    return;
  }

  if (method === "POST" && path === "/v1/auth/device/complete") {
    const body = await readJsonBody(request);
    if (typeof body.deviceCode !== "string" || body.deviceCode.length === 0) {
      sendJson(response, 400, { error: "deviceCode is required" });
      return;
    }

    sendJson(response, 200, {
      accessToken: process.env.MIMIR_DEV_ACCESS_TOKEN ?? "dev-token",
      userId: process.env.MIMIR_DEV_USER_ID ?? "dev-user",
    });
    return;
  }

  if (method === "POST" && path === "/v1/memories/batch") {
    const auth = request.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) {
      sendJson(response, 401, { error: "Bearer token is required" });
      return;
    }

    const body = await readJsonBody(request);
    const chunks = Array.isArray(body.chunks) ? body.chunks : [];
    const acceptedContentHashes = chunks
      .map((chunk) => chunk.contentHash)
      .filter((hash): hash is string => typeof hash === "string" && hash.length > 0);

    sendJson(response, 200, {
      accepted: acceptedContentHashes.length,
      acceptedContentHashes,
    });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function readJsonBody(request: IncomingMessage): Promise<RequestBody> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) {
    return {};
  }

  const parsed = JSON.parse(text) as unknown;
  return isRecord(parsed) ? parsed : {};
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function isRecord(value: unknown): value is RequestBody {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
