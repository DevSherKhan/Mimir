import type { CloudDatabase, CloudSearchResult } from "../../cloud/db/types.js";
import type { McpSearchHistoricalChatsDto } from "../../cloud/dto/mcp.dto.js";
import { getMimirConfig } from "../../config/index.js";
import type { StoredChunk } from "../../local/db/sqlite.js";
import { createEmbeddingProvider } from "../../core/embeddings/provider.js";
import { formatSearchResponse, normalizeSourceTool, parseOptionalTimestamp } from "../../core/search.js";
import { redactSecrets } from "../../core/security/redact.js";

const embeddingProvider = createEmbeddingProvider(getMimirConfig().embeddingProvider);

export async function searchCloudMemories(
  database: CloudDatabase,
  userId: string,
  input: McpSearchHistoricalChatsDto,
) {
  const query = input.query.trim();
  if (!query) {
    throw new Error("query is required");
  }

  const limit = parseLimitValue(input.limit, 5, 1, 20);
  const embedding = await embeddingProvider.embed(redactSecrets(query));
  const filters = {
    sourceTool: input.sourceTool ? normalizeSourceTool(input.sourceTool) : undefined,
    sessionId: input.sessionId,
    workspacePath: input.workspacePath,
    since: input.since ? parseOptionalTimestamp(input.since, "since") : undefined,
    until: input.until ? parseOptionalTimestamp(input.until, "until") : undefined,
  };
  const results = await database.searchMemories(userId, embedding, {
    limit,
    ...filters,
  });

  return formatSearchResponse(query, results.map(toStoredChunk), {
    provider: embeddingProvider.name,
    model: embeddingProvider.model,
    limit,
    filters,
  });
}

function toStoredChunk(result: CloudSearchResult): StoredChunk {
  return {
    chunkId: result.chunkId,
    sourceTool: result.sourceTool,
    workspacePath: result.workspacePath,
    sessionId: result.sessionId,
    role: result.role,
    timestamp: result.timestamp,
    distance: result.distance,
    content: result.content,
  };
}

function parseLimitValue(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value === "undefined" || value === null || value === "") {
    return fallback;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`limit must be an integer between ${min} and ${max}`);
  }

  return parsed;
}
