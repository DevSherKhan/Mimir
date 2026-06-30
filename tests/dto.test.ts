import { describe, expect, it } from "vitest";
import { startDeviceLoginDtoSchema } from "../src/cloud/dto/auth.dto.js";
import { EMBEDDING_DIMENSIONS } from "../src/config/index.js";
import { uploadMemoryBatchDtoSchema } from "../src/cloud/dto/memory.dto.js";
import { mcpSearchHistoricalChatsDtoSchema } from "../src/cloud/dto/mcp.dto.js";

describe("cloud DTOs", () => {
  it("accepts valid upload batches", () => {
    const parsed = uploadMemoryBatchDtoSchema.safeParse({
      chunks: [{
        sourceTool: "codex",
        workspacePath: "/repo",
        sessionId: "session-1",
        role: "user",
        timestamp: 1782691200000,
        content: "Sanitized memory",
        contentHash: "hash-1",
        embeddingProvider: "dev",
        embeddingModel: "mimir-dev-hash-v1",
        embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01),
      }],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects malformed upload embeddings", () => {
    const parsed = uploadMemoryBatchDtoSchema.safeParse({
      chunks: [{
        sourceTool: "codex",
        sessionId: "session-1",
        role: "user",
        timestamp: 1782691200000,
        content: "Sanitized memory",
        contentHash: "hash-1",
        embeddingProvider: "dev",
        embeddingModel: "mimir-dev-hash-v1",
        embedding: [0.01],
      }],
    });

    expect(parsed.success).toBe(false);
  });

  it("requires MCP search queries", () => {
    expect(mcpSearchHistoricalChatsDtoSchema.safeParse({ query: "billing bug", limit: 3 }).success).toBe(true);
    expect(mcpSearchHistoricalChatsDtoSchema.safeParse({ limit: 3 }).success).toBe(false);
  });

  it("requires install identity for device login", () => {
    expect(startDeviceLoginDtoSchema.safeParse({
      client: "mimir-cli",
      installId: "install_00000000-0000-4000-8000-000000000000",
    }).success).toBe(true);
    expect(startDeviceLoginDtoSchema.safeParse({ client: "mimir-cli" }).success).toBe(false);
  });
});
