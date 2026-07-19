import formBody from "@fastify/formbody";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { CloudAuthRepository } from "../src/cloud/db/repositories/auth.repository.js";
import { DeviceLoginStateError, type CloudDatabase } from "../src/cloud/db/types.js";
import { registerAuthRoutes } from "../src/server/routes/auth.routes.js";
import { registerDeviceRoutes } from "../src/server/routes/device.routes.js";

describe("device login", () => {
  it("does not issue a CLI token before browser approval", async () => {
    const { repository, client } = repositoryWithLoginState({
      approved_at: null,
      consumed_at: null,
      access_token_hash: null,
      approved_user_id: "user-1",
      expires_at: new Date(Date.now() + 60_000),
    });

    await expect(repository.completeDeviceLogin("device-1")).resolves.toBeNull();
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO access_tokens"))).toBe(false);
  });

  it("issues a CLI token after browser approval", async () => {
    const { repository, client } = repositoryWithLoginState({
      approved_at: new Date(),
      consumed_at: null,
      access_token_hash: null,
      approved_user_id: "user-1",
      expires_at: new Date(Date.now() + 60_000),
    });

    await expect(repository.completeDeviceLogin("device-1")).resolves.toMatchObject({
      userId: "user-1",
      accessToken: expect.stringMatching(/^mimir_/),
    });
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO access_tokens"))).toBe(true);
  });

  it("returns a clear expired-code error", async () => {
    const { repository } = repositoryWithLoginState({
      approved_at: null,
      consumed_at: null,
      access_token_hash: null,
      approved_user_id: "user-1",
      expires_at: new Date(Date.now() - 1),
    });

    await expect(repository.completeDeviceLogin("device-1")).rejects.toMatchObject({
      statusCode: 410,
      message: expect.stringContaining("expired"),
    } satisfies Partial<DeviceLoginStateError>);
  });

  it("sets a secure browser session when a code is approved", async () => {
    const app = Fastify();
    await app.register(formBody);
    const cloudDatabase = {
      consumeRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60 })),
      approveDeviceLogin: vi.fn(async () => ({ userId: "user-1" })),
      createBearerToken: vi.fn(async () => ({
        userId: "user-1",
        accessToken: "mimir_browser_token",
      })),
      recordAuditEvent: vi.fn(async () => undefined),
    } as unknown as CloudDatabase;
    await registerDeviceRoutes(app, { cloudDatabase, port: 3000 });

    const response = await app.inject({
      method: "POST",
      url: "/device/approve",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-proto": "https",
      },
      payload: "code=AB12CD34",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("mimir_session=mimir_browser_token");
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]).toContain("SameSite=Lax");
    expect(response.headers["set-cookie"]).toContain("Secure");
    expect(response.body).toContain("Open memory dashboard");
    await app.close();
  });

  it("keeps CLI completion pending until approval", async () => {
    const app = Fastify();
    const cloudDatabase = {
      consumeRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60 })),
      completeDeviceLogin: vi.fn(async () => null),
    } as unknown as CloudDatabase;
    await registerAuthRoutes(app, { cloudDatabase, port: 3000 });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/device/complete",
      payload: { deviceCode: "device-1" },
    });

    expect(response.statusCode).toBe(428);
    expect(response.json()).toEqual({
      error: "Authorization pending. Approve the login code in your browser.",
    });
    await app.close();
  });

  it("returns explicit device-code state errors through the API", async () => {
    const app = Fastify();
    const cloudDatabase = {
      consumeRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60 })),
      completeDeviceLogin: vi.fn(async () => {
        throw new DeviceLoginStateError(410, "Login code expired. Start login again to get a new code.");
      }),
    } as unknown as CloudDatabase;
    await registerAuthRoutes(app, { cloudDatabase, port: 3000 });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/device/complete",
      payload: { deviceCode: "device-1" },
    });

    expect(response.statusCode).toBe(410);
    expect(response.json()).toEqual({
      error: "Login code expired. Start login again to get a new code.",
    });
    await app.close();
  });
});

function repositoryWithLoginState(row: {
  approved_at: Date | null;
  consumed_at: Date | null;
  access_token_hash: string | null;
  approved_user_id: string | null;
  expires_at: Date;
}) {
  const client = {
    query: vi.fn(async (sql: string) => {
      if (sql.includes("SELECT approved_user_id")) {
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    }),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn(async () => client),
  };

  return {
    client,
    repository: new CloudAuthRepository(pool as never),
  };
}
