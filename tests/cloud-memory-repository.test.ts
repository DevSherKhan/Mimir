import { describe, expect, it, vi } from "vitest";
import { CloudMemoryRepository } from "../src/cloud/db/repositories/memory.repository.js";

describe("cloud memory repository", () => {
  it("reports only chunks newly accepted by PostgreSQL", async () => {
    const insertResults = [{ rowCount: 1 }, { rowCount: 0 }];
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("INSERT INTO memory_chunks")) {
          return insertResults.shift();
        }
        return { rowCount: 0 };
      }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn(async () => client),
    };
    const repository = new CloudMemoryRepository(pool as never);
    const chunks = ["new-hash", "duplicate-hash"].map((contentHash, index) => ({
      sourceTool: "codex",
      workspacePath: "/repo",
      sessionId: "session-1",
      role: "assistant",
      timestamp: 1782691200000 + index,
      content: `chunk ${index}`,
      contentHash,
      embeddingProvider: "dev",
      embeddingModel: "mimir-dev-hash-v1",
      embedding: [0.1, 0.2],
    }));

    await expect(repository.insertMemoryBatch("user-1", chunks)).resolves.toEqual(["new-hash"]);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
