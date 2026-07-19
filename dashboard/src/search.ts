export interface MemorySearchFilters {
  query: string;
  sourceTool?: string;
  sessionId?: string;
  workspacePath?: string;
  role?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export function buildMemorySearchParams(filters: MemorySearchFilters): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(filters.limit ?? 10),
  });

  appendTrimmed(params, "query", filters.query);
  appendTrimmed(params, "sourceTool", filters.sourceTool);
  appendTrimmed(params, "sessionId", filters.sessionId);
  appendTrimmed(params, "workspacePath", filters.workspacePath);
  appendTrimmed(params, "role", filters.role);
  appendTrimmed(params, "since", filters.since);
  appendTrimmed(params, "until", filters.until);
  return params;
}

function appendTrimmed(params: URLSearchParams, key: string, value: string | undefined): void {
  const normalized = value?.trim();
  if (normalized) {
    params.set(key, normalized);
  }
}
