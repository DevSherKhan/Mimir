import type { CloudDatabase, CloudKeywordSearchResult, CloudMemoryResult, CloudSearchResult } from "../../cloud/db/types.js";
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
  const sanitizedQuery = redactSecrets(query);
  const embedding = await embeddingProvider.embed(sanitizedQuery);
  const filters = {
    sourceTool: input.sourceTool ? normalizeSourceTool(input.sourceTool) : undefined,
    sessionId: input.sessionId,
    workspacePath: input.workspacePath,
    role: input.role,
    since: input.since ? parseOptionalTimestamp(input.since, "since") : undefined,
    until: input.until ? parseOptionalTimestamp(input.until, "until") : undefined,
  };
  const candidateLimit = Math.min(80, Math.max(20, limit * 4));
  const [semanticResults, keywordResults] = await Promise.all([
    database.searchMemories(userId, embedding, {
      limit: candidateLimit,
      ...filters,
    }),
    database.keywordSearchMemories(userId, sanitizedQuery, {
      limit: candidateLimit,
      ...filters,
    }),
  ]);
  const results = fuseSearchResults(semanticResults, keywordResults, limit, embeddingProvider.name === "dev");

  return formatSearchResponse(query, results, {
    provider: embeddingProvider.name,
    model: embeddingProvider.model,
    strategy: "hybrid",
    limit,
    filters,
  });
}

export async function browseCloudMemories(
  database: CloudDatabase,
  userId: string,
  input: Omit<McpSearchHistoricalChatsDto, "query">,
) {
  const limit = parseLimitValue(input.limit, 10, 1, 20);
  const filters = {
    sourceTool: input.sourceTool ? normalizeSourceTool(input.sourceTool) : undefined,
    sessionId: input.sessionId,
    workspacePath: input.workspacePath,
    role: input.role,
    since: input.since ? parseOptionalTimestamp(input.since, "since") : undefined,
    until: input.until ? parseOptionalTimestamp(input.until, "until") : undefined,
  };
  const results = await database.listMemories(userId, {
    limit,
    ...filters,
  });

  return {
    mode: "browse" as const,
    metadata: {
      limit,
      filters,
    },
    resultCount: results.length,
    results: results.map(formatBrowseResult),
  };
}

function fuseSearchResults(
  semanticResults: CloudSearchResult[],
  keywordResults: CloudKeywordSearchResult[],
  limit: number,
  preferKeywords: boolean,
): StoredChunk[] {
  const scores = new Map<string, { result: CloudMemoryResult; score: number }>();
  const semanticWeight = preferKeywords ? 0.35 : 1;
  const keywordWeight = preferKeywords ? 1.4 : 1;
  const rankOffset = 60;

  semanticResults.forEach((result, index) => {
    scores.set(result.chunkId, {
      result,
      score: semanticWeight / (rankOffset + index + 1),
    });
  });
  keywordResults.forEach((result, index) => {
    const existing = scores.get(result.chunkId);
    scores.set(result.chunkId, {
      result,
      score: (existing?.score ?? 0) + keywordWeight / (rankOffset + index + 1),
    });
  });

  const ranked = [...scores.values()].sort((left, right) => right.score - left.score).slice(0, limit);
  const bestScore = ranked[0]?.score ?? 1;
  return ranked.map(({ result, score }) => ({
    ...result,
    distance: 1 - score / bestScore,
  }));
}

function formatBrowseResult(result: CloudMemoryResult) {
  return {
    ...result,
    isoTimestamp: new Date(result.timestamp).toISOString(),
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
