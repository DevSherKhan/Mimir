import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server/app.js";

describe("server production hardening", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trusts the Railway proxy and sends browser security headers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    const app = await buildServer(3000);
    app.get("/test-ip", async (request) => ({ ip: request.ip }));
    app.get("/test-error", async () => {
      throw new Error("sensitive database failure");
    });

    const response = await app.inject({
      method: "GET",
      url: "/test-ip",
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "x-forwarded-proto": "https",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ip: "203.0.113.10" });
    expect(response.headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(response.headers["content-security-policy"]).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");

    const errorResponse = await app.inject({ method: "GET", url: "/test-error" });
    expect(errorResponse.statusCode).toBe(500);
    expect(errorResponse.json()).toEqual({
      error: "Internal server error",
      requestId: expect.any(String),
    });
    expect(errorResponse.body).not.toContain("sensitive database failure");
    await app.close();
  });
});
