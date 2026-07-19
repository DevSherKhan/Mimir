import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { CloudDatabase } from "../src/cloud/db/types.js";
import { checkRateLimit } from "../src/server/utils/rate-limit.js";

describe("server rate limiting", () => {
  it("uses the shared cloud decision and returns Retry-After", async () => {
    const app = Fastify();
    const cloudDatabase = {
      consumeRateLimit: vi.fn(async () => ({
        allowed: false,
        retryAfterSeconds: 17,
      })),
    } as unknown as CloudDatabase;

    app.get("/limited", async (request, reply) => {
      if (!await checkRateLimit(request, reply, { cloudDatabase, port: 3000 }, "test", 1, 60_000)) {
        return reply;
      }
      return { ok: true };
    });

    const response = await app.inject({ method: "GET", url: "/limited" });

    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBe("17");
    expect(cloudDatabase.consumeRateLimit).toHaveBeenCalledWith("test", "127.0.0.1", 1, 60_000);
    await app.close();
  });
});
