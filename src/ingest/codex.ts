import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { expandHome } from "../config.js";
import { listFilesRecursive } from "./files.js";
import type { RawMessage } from "./types.js";

export function defaultCodexDir(): string {
  return expandHome("~/.codex");
}

export function readCodexMessages(root = defaultCodexDir()): RawMessage[] {
  if (!existsSync(root)) {
    return [];
  }

  return [
    ...readCodexSessionMessages(root),
    ...readCodexHistory(root),
    ...readCodexSessionIndex(root),
  ];
}

function readCodexSessionMessages(root: string): RawMessage[] {
  const sessionsDir = join(root, "sessions");
  if (!existsSync(sessionsDir)) {
    return [];
  }

  const files = listFilesRecursive(sessionsDir, (path) => path.endsWith(".jsonl"));
  const messages: RawMessage[] = [];

  for (const file of files) {
    messages.push(...readCodexSessionFile(file));
  }

  return messages;
}

function readCodexSessionFile(file: string): RawMessage[] {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const messages: RawMessage[] = [];
  let sessionId = sessionIdFromFile(file);
  let workspacePath: string | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const record = safeJson(line);
    if (!record) {
      continue;
    }

    if (record.type === "session_meta" && isRecord(record.payload)) {
      sessionId = readString(record.payload, ["session_id"]) ?? readString(record.payload, ["id"]) ?? sessionId;
      workspacePath = readString(record.payload, ["cwd"]) ?? workspacePath;
      continue;
    }

    if (record.type !== "event_msg" || !isRecord(record.payload)) {
      continue;
    }

    const payloadType = readString(record.payload, ["type"]);
    const content = extractEventMessageContent(record.payload);
    if (!content || !shouldIndexContent(content)) {
      continue;
    }

    messages.push({
      sourceTool: "codex",
      workspacePath,
      sessionId,
      role: payloadType === "agent_message" ? "assistant" : "user",
      content,
      timestamp: readTimestamp(record),
    });
  }

  return messages;
}

function readCodexHistory(root: string): RawMessage[] {
  const file = join(root, "history.jsonl");
  if (!existsSync(file)) {
    return [];
  }

  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .flatMap((line) => {
      const record = safeJson(line);
      const content = record ? readString(record, ["text"]) : null;
      if (!record || !content || !shouldIndexContent(content)) {
        return [];
      }

      return [{
        sourceTool: "codex" as const,
        sessionId: readString(record, ["session_id"]) ?? "codex-history",
        workspacePath: null,
        role: "user",
        content,
        timestamp: readUnixOrIsoTimestamp(record, "ts"),
      }];
    });
}

function readCodexSessionIndex(root: string): RawMessage[] {
  const file = join(root, "session_index.jsonl");
  if (!existsSync(file)) {
    return [];
  }

  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .flatMap((line) => {
      const record = safeJson(line);
      const threadName = record ? readString(record, ["thread_name"]) : null;
      if (!record || !threadName || !shouldIndexContent(threadName)) {
        return [];
      }

      return [{
        sourceTool: "codex" as const,
        sessionId: readString(record, ["id"]) ?? "codex-session-index",
        workspacePath: null,
        role: "unknown",
        content: `Codex thread: ${threadName}`,
        timestamp: readUnixOrIsoTimestamp(record, "updated_at"),
      }];
    });
}

function extractEventMessageContent(payload: Record<string, unknown>): string | null {
  const payloadType = readString(payload, ["type"]);
  if (payloadType === "user_message") {
    return readString(payload, ["message"]);
  }

  if (payloadType === "agent_message") {
    return readString(payload, ["message"]);
  }

  return null;
}

function shouldIndexContent(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 8) {
    return false;
  }

  const internalPrefixes = [
    "<environment_context",
    "<permissions instructions",
    "<collaboration_mode",
    "<personality_spec",
    "<apps_instructions",
    "<skills_instructions",
    "<plugins_instructions",
    "<turn_aborted",
  ];

  return !internalPrefixes.some((prefix) => trimmed.startsWith(prefix));
}

function sessionIdFromFile(file: string): string {
  const name = basename(file, ".jsonl");
  const match = name.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match?.[1] ?? name;
}

function readTimestamp(record: Record<string, unknown>): number {
  const raw = readString(record, ["timestamp"]);
  if (!raw) {
    return Date.now();
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function readUnixOrIsoTimestamp(record: Record<string, unknown>, key: string): number {
  const raw = record[key];
  if (typeof raw === "number") {
    return raw < 10_000_000_000 ? raw * 1000 : raw;
  }

  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  return Date.now();
}

function readString(value: Record<string, unknown>, path: string[]): string | null {
  let current: unknown = value;
  for (const segment of path) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[segment];
  }

  return typeof current === "string" && current.trim() ? current : null;
}

function safeJson(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
