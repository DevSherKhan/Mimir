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

  it("browses filtered memories newest first", async () => {
    const query = vi.fn(async () => ({
      rows: [{
        chunk_id: "chunk-1",
        source_tool: "codex",
        workspace_path: "/repo",
        session_id: "session-1",
        role: "user",
        timestamp: "1782691200000",
        content: "A recent Codex memory",
      }],
    }));
    const repository = new CloudMemoryRepository({ query } as never);

    await expect(repository.listMemories("user-1", {
      sourceTool: "codex",
      limit: 10,
    })).resolves.toEqual([{
      chunkId: "chunk-1",
      sourceTool: "codex",
      workspacePath: "/repo",
      sessionId: "session-1",
      role: "user",
      timestamp: 1782691200000,
      content: "A recent Codex memory",
    }]);

    expect(query.mock.calls[0]?.[0]).toContain("ORDER BY occurred_at DESC, created_at DESC");
    expect(query.mock.calls[0]?.[1]).toEqual([
      "user-1",
      "codex",
      null,
      null,
      null,
      null,
      null,
      10,
    ]);
  });
});
