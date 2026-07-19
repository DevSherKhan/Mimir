import { describe, expect, it, vi } from "vitest";
import { CloudOperationsRepository } from "../src/cloud/db/repositories/operations.repository.js";

describe("cloud operations repository", () => {
  it("uses a shared hashed rate-limit bucket", async () => {
    const pool = {
      query: vi.fn(async () => ({
        rows: [{ request_count: 3, retry_after_seconds: 42 }],
      })),
    };
    const repository = new CloudOperationsRepository(pool as never);

    await expect(repository.consumeRateLimit("mcp.call", "secret-token", 2, 60_000)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 42,
    });

    const params = pool.query.mock.calls[0]?.[1] as unknown[];
    expect(params[0]).toBe("mcp.call");
    expect(params[1]).toMatch(/^[0-9a-f]{64}$/);
    expect(params[1]).not.toBe("secret-token");
    expect(params[2]).toBe(60_000);
  });

  it("returns recent user audit events", async () => {
    const pool = {
      query: vi.fn(async () => ({
        rows: [{
          id: "audit-1",
          action: "auth.logout",
          metadata: {},
          created_at: "2026-07-19T12:00:00.000Z",
        }],
      })),
    };
    const repository = new CloudOperationsRepository(pool as never);

    await expect(repository.listAuditEvents("user-1", 50)).resolves.toEqual([{
      id: "audit-1",
      action: "auth.logout",
      metadata: {},
      createdAt: "2026-07-19T12:00:00.000Z",
    }]);
  });
});
