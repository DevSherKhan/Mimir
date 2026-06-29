import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { expandHome } from "../config.js";
import { listFilesRecursive } from "./files.js";
import type { RawMessage } from "./types.js";

export function defaultClaudeDir(): string {
  return expandHome("~/.claude/projects");
}

export function readClaudeMessages(root = defaultClaudeDir()): RawMessage[] {
  if (!existsSync(root)) {
    return [];
  }

  const files = listFilesRecursive(root, (path) => path.endsWith(".jsonl"));
  const messages: RawMessage[] = [];

  for (const file of files) {
    const sessionId = basename(file, ".jsonl");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const parsed = safeJson(line);
      if (!parsed) {
        continue;
      }

      const role = readString(parsed, ["message", "role"]) ?? readString(parsed, ["role"]) ?? readString(parsed, ["type"]) ?? "unknown";
      const content = extractContent(parsed);
      if (!content) {
        continue;
      }

      messages.push({
        sourceTool: "claude-code",
        sessionId: readString(parsed, ["sessionId"]) ?? readString(parsed, ["session_id"]) ?? sessionId,
        workspacePath: readString(parsed, ["cwd"]) ?? readString(parsed, ["workspace"]) ?? null,
        role,
        content,
        timestamp: readTimestamp(parsed),
      });
    }
  }

  return messages;
}

function extractContent(value: Record<string, unknown>): string | null {
  const direct = readString(value, ["content"]) ?? readString(value, ["message", "content"]);
  if (direct) {
    return direct;
  }

  const nested = readValue(value, ["message", "content"]);
  if (Array.isArray(nested)) {
    const parts = nested
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object") {
          return readString(part as Record<string, unknown>, ["text"]) ?? readString(part as Record<string, unknown>, ["content"]);
        }
        return null;
      })
      .filter((part): part is string => Boolean(part));

    return parts.length > 0 ? parts.join("\n") : null;
  }

  return null;
}

function readTimestamp(value: Record<string, unknown>): number {
  const raw = readString(value, ["timestamp"]) ?? readString(value, ["created_at"]);
  if (!raw) {
    return Date.now();
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function readString(value: Record<string, unknown>, path: string[]): string | null {
  const found = readValue(value, path);
  return typeof found === "string" && found.trim() ? found : null;
}

function readValue(value: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function safeJson(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
