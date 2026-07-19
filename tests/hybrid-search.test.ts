import { describe, expect, it, vi } from "vitest";
import type { CloudDatabase, CloudMemoryResult } from "../src/cloud/db/types.js";
import { searchCloudMemories } from "../src/server/services/search.service.js";

describe("hybrid cloud search", () => {
  it("combines semantic and keyword candidates and favors exact text with dev embeddings", async () => {
    const base = (chunkId: string, content: string): CloudMemoryResult => ({
      chunkId,
      sourceTool: "codex",
      workspacePath: "/repo",
      sessionId: `session-${chunkId}`,
      role: "assistant",
      timestamp: 1782691200000,
      content,
    });
    const searchMemories = vi.fn(async () => [
      { ...base("semantic", "A loosely related result"), distance: 0.1 },
      { ...base("exact", "The authentication decision"), distance: 0.3 },
    ]);
    const keywordSearchMemories = vi.fn(async () => [
      { ...base("exact", "The authentication decision"), textRank: 0.8 },
    ]);
    const database = { searchMemories, keywordSearchMemories } as unknown as CloudDatabase;

    const result = await searchCloudMemories(database, "user-1", {
      query: "authentication decision",
      sourceTool: "codex",
      limit: 2,
    });

    expect(result.metadata.strategy).toBe("hybrid");
    expect(result.results.map((item) => item.chunkId)).toEqual(["exact", "semantic"]);
    expect(keywordSearchMemories).toHaveBeenCalledOnce();
  });
});
