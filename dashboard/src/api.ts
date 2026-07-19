import { buildMemorySearchParams, type MemorySearchFilters } from "./search.js";
import type { ConversationEntryPage, ConversationPage, DashboardSummary, MemorySearchResponse } from "./types.js";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getDashboard(): Promise<DashboardSummary> {
  return requestJson("/v1/dashboard");
}

export async function getConversations(options: {
  sourceTool?: string;
  workspacePath?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<ConversationPage> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 20) });
  append(params, "sourceTool", options.sourceTool);
  append(params, "workspacePath", options.workspacePath);
  append(params, "cursor", options.cursor);
  return requestJson(`/v1/conversations?${params}`);
}

export async function getConversationEntries(
  sourceTool: string,
  sessionId: string,
  cursor?: string,
): Promise<ConversationEntryPage> {
  const params = new URLSearchParams({ sourceTool, limit: "50" });
  append(params, "cursor", cursor);
  return requestJson(`/v1/conversations/${encodeURIComponent(sessionId)}?${params}`);
}

export async function findMemories(filters: MemorySearchFilters): Promise<MemorySearchResponse> {
  const params = buildMemorySearchParams(filters);
  const endpoint = filters.query.trim() ? "/v1/memories/search" : "/v1/memories/browse";
  return requestJson(`${endpoint}?${params}`);
}

export async function revokeCurrentToken(): Promise<void> {
  await requestJson("/v1/auth/logout", { method: "POST" });
}

export async function revokeEveryToken(): Promise<void> {
  await requestJson("/v1/auth/revoke-all", { method: "POST" });
}

export async function removeInstall(installId: string): Promise<void> {
  await requestJson(`/v1/install-identities/${encodeURIComponent(installId)}`, { method: "DELETE" });
}

export async function deleteCloudMemory(): Promise<number> {
  const result = await requestJson<{ deleted?: number }>("/v1/memories", { method: "DELETE" });
  return result.deleted ?? 0;
}

export async function exportCloudMemory(): Promise<void> {
  const response = await fetch("/v1/memories/export", { credentials: "same-origin" });
  if (!response.ok) {
    throw new ApiError(response.status, "Could not export memory");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mimir-memory-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
  });
  const text = await response.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === "string"
      ? body.error
      : response.status === 404
        ? "This feature is not available on the running server. Rebuild and restart Mimir."
        : `Request failed with HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }
  return body as T;
}

function append(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value?.trim()) {
    params.set(key, value.trim());
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
