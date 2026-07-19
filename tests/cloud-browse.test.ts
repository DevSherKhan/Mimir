import { describe, expect, it, vi } from "vitest";
import type { CloudDatabase } from "../src/cloud/db/types.js";
import { browseCloudMemories } from "../src/server/services/search.service.js";

describe("cloud memory browsing", () => {
  it("lists newest memories using normalized dashboard filters without embedding a query", async () => {
    const listMemories = vi.fn(async () => [{
      chunkId: "chunk-1",
      sourceTool: "claude-code",
      workspacePath: "/repo",
      sessionId: "session-1",
      role: "assistant",
      timestamp: 1782691200000,
      content: "Filtered memory",
    }]);
    const database = { listMemories } as unknown as CloudDatabase;

    await expect(browseCloudMemories(database, "user-1", {
      sourceTool: "claude",
      workspacePath: "/repo",
      limit: 10,
    })).resolves.toMatchObject({
      mode: "browse",
      resultCount: 1,
      results: [{
        chunkId: "chunk-1",
        sourceTool: "claude-code",
        isoTimestamp: new Date(1782691200000).toISOString(),
      }],
    });

    expect(listMemories).toHaveBeenCalledWith("user-1", {
      limit: 10,
      sourceTool: "claude-code",
      sessionId: undefined,
      workspacePath: "/repo",
      since: undefined,
      until: undefined,
    });
  });
});
