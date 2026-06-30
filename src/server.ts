import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createCloudDatabase, userIdForBearerToken } from "./cloud-db.js";
import type { MemoryChunkUpload } from "./db.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";
const cloudDatabase = createCloudDatabase();

interface RequestBody {
  chunks?: unknown;
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
      database: cloudDatabase ? "configured" : "not_configured",
    });
    return;
  }

  if (method === "POST" && path === "/v1/auth/device/start") {
    if (!cloudDatabase) {
      sendJson(response, 503, { error: "DATABASE_URL is not configured" });
      return;
    }

    sendJson(response, 200, await cloudDatabase.startDeviceLogin(baseUrl(request)));
    return;
  }

  if (method === "POST" && path === "/v1/auth/device/complete") {
    if (!cloudDatabase) {
      sendJson(response, 503, { error: "DATABASE_URL is not configured" });
      return;
    }

    const body = await readJsonBody(request);
    if (typeof body.deviceCode !== "string" || body.deviceCode.length === 0) {
      sendJson(response, 400, { error: "deviceCode is required" });
      return;
    }

    const completed = await cloudDatabase.completeDeviceLogin(body.deviceCode);
    if (!completed) {
      sendJson(response, 428, { error: "Authorization pending" });
      return;
    }

    sendJson(response, 200, completed);
    return;
  }

  if (method === "GET" && path === "/device") {
    const code = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).searchParams.get("code") ?? "";
    sendHtml(response, 200, deviceApprovalHtml(code));
    return;
  }

  if (method === "POST" && path === "/device/approve") {
    if (!cloudDatabase) {
      sendHtml(response, 503, pageHtml("Mimir Login", "DATABASE_URL is not configured."));
      return;
    }

    const form = await readFormBody(request);
    const code = form.get("code")?.toString() ?? "";
    try {
      await cloudDatabase.approveDeviceLogin(code);
      sendHtml(response, 200, pageHtml("Mimir Login Approved", "You can return to your terminal now."));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not approve login.";
      sendHtml(response, 400, pageHtml("Mimir Login Failed", message));
    }
    return;
  }

  if (method === "POST" && path === "/v1/memories/batch") {
    const userId = await authenticate(request);
    if (!userId) {
      sendJson(response, 401, { error: "Valid bearer token is required" });
      return;
    }

    if (!cloudDatabase) {
      sendJson(response, 503, { error: "DATABASE_URL is not configured" });
      return;
    }

    const body = await readJsonBody(request);
    const chunks = Array.isArray(body.chunks) ? body.chunks.filter(isMemoryChunkUpload) : [];
    const acceptedContentHashes = await cloudDatabase.insertMemoryBatch(userId, chunks);

    sendJson(response, 200, {
      accepted: acceptedContentHashes.length,
      acceptedContentHashes,
    });
    return;
  }

  if (method === "GET" && path === "/v1/memories/count") {
    const userId = await authenticate(request);
    if (!userId) {
      sendJson(response, 401, { error: "Valid bearer token is required" });
      return;
    }

    if (!cloudDatabase) {
      sendJson(response, 503, { error: "DATABASE_URL is not configured" });
      return;
    }

    const count = await cloudDatabase.countMemories(userId);
    sendJson(response, 200, { userId, count });
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

async function readFormBody(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function sendHtml(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function authenticate(request: IncomingMessage): Promise<string | null> {
  const auth = request.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  return userIdForBearerToken(auth.slice("Bearer ".length).trim(), cloudDatabase);
}

function isMemoryChunkUpload(value: unknown): value is MemoryChunkUpload {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.sourceTool === "string"
    && (typeof value.workspacePath === "string" || value.workspacePath === null || typeof value.workspacePath === "undefined")
    && typeof value.sessionId === "string"
    && typeof value.role === "string"
    && typeof value.timestamp === "number"
    && typeof value.content === "string"
    && typeof value.contentHash === "string"
    && typeof value.embeddingProvider === "string"
    && typeof value.embeddingModel === "string"
    && Array.isArray(value.embedding);
}

function baseUrl(request: IncomingMessage): string {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const scheme = proto ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = request.headers["x-forwarded-host"] ?? request.headers.host ?? `localhost:${port}`;
  const hostname = Array.isArray(host) ? host[0] : host;
  return `${scheme}://${hostname}`;
}

function deviceApprovalHtml(code: string): string {
  return pageHtml("Approve Mimir Login", `
    <form method="post" action="/device/approve">
      <label>
        Login code
        <input name="code" value="${escapeHtml(code)}" required />
      </label>
      <button type="submit">Approve login</button>
    </form>
  `);
}

function pageHtml(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 520px; margin: 80px auto; padding: 0 20px; line-height: 1.5; }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 6px; font-weight: 600; }
      input { font: inherit; padding: 10px 12px; border: 1px solid #bbb; border-radius: 6px; }
      button { font: inherit; padding: 10px 14px; border: 0; border-radius: 6px; background: #111; color: white; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${content.includes("<") ? content : `<p>${escapeHtml(content)}</p>`}
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
