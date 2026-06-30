import type { StoredChunk } from "../local/db/sqlite.js";

export type SourceTool = "claude-code" | "codex" | "cursor" | "fixture";

export interface SearchFilters {
  sourceTool?: SourceTool;
  sessionId?: string;
  workspacePath?: string;
  since?: number;
  until?: number;
}

export interface SearchMetadata {
  provider: string;
  model: string;
  limit: number;
  filters: SearchFilters;
}

export interface FormattedSearchResult {
  chunkId: string;
  sourceTool: SourceTool;
  workspacePath: string | null;
  sessionId: string;
  role: string;
  timestamp: number;
  isoTimestamp: string;
  score: number;
  distance: number;
  content: string;
}

export interface FormattedSearchResponse {
  query: string;
  metadata: SearchMetadata;
  resultCount: number;
  results: FormattedSearchResult[];
}

const SOURCE_ALIASES: Record<string, SourceTool> = {
  claude: "claude-code",
  "claude-code": "claude-code",
  codex: "codex",
  cursor: "cursor",
  fixture: "fixture",
  fixtures: "fixture",
};

export function normalizeSourceTool(input: string | undefined): SourceTool | undefined {
  if (!input) {
    return undefined;
  }

  const sourceTool = SOURCE_ALIASES[input.toLowerCase()];
  if (!sourceTool) {
    throw new Error(`Unsupported source "${input}". Use claude, codex, cursor, or fixtures.`);
  }

  return sourceTool;
}

export function parseOptionalTimestamp(input: string | undefined, label: string): number | undefined {
  if (!input) {
    return undefined;
  }

  const numeric = Number(input);
  if (Number.isFinite(numeric)) {
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }

  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be an ISO date string, Unix seconds, or Unix milliseconds.`);
  }

  return parsed;
}

export function formatSearchResponse(
  query: string,
  results: StoredChunk[],
  metadata: SearchMetadata,
): FormattedSearchResponse {
  return {
    query,
    metadata,
    resultCount: results.length,
    results: results.map(formatSearchResult),
  };
}

export function formatSearchResult(result: StoredChunk): FormattedSearchResult {
  return {
    chunkId: result.chunkId,
    sourceTool: result.sourceTool as SourceTool,
    workspacePath: result.workspacePath,
    sessionId: result.sessionId,
    role: result.role,
    timestamp: result.timestamp,
    isoTimestamp: new Date(result.timestamp).toISOString(),
    score: Number((1 - result.distance).toFixed(6)),
    distance: Number(result.distance.toFixed(6)),
    content: result.content,
  };
}
