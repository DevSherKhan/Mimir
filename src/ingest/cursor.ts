import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { platform } from "node:os";
import { expandHome } from "../config.js";
import { listFilesRecursive } from "./files.js";
import type { RawMessage } from "./types.js";

interface CursorRow {
  key: string;
  value: Buffer | string | null;
}

export function defaultCursorDir(): string {
  switch (platform()) {
    case "darwin":
      return expandHome("~/Library/Application Support/Cursor/User/workspaceStorage");
    case "win32":
      return join(process.env.APPDATA ?? expandHome("~/AppData/Roaming"), "Cursor/User/workspaceStorage");
    default:
      return expandHome("~/.config/Cursor/User/workspaceStorage");
  }
}

export function readCursorMessages(root = defaultCursorDir()): RawMessage[] {
  if (!existsSync(root)) {
    return [];
  }

  const dbFiles = listFilesRecursive(root, (path) => basename(path) === "state.vscdb");
  const messages: RawMessage[] = [];

  for (const dbFile of dbFiles) {
    messages.push(...readCursorDatabase(dbFile));
  }

  return messages;
}

function readCursorDatabase(dbFile: string): RawMessage[] {
  let db: Database.Database | null = null;
  try {
    db = new Database(dbFile, { readonly: true, fileMustExist: true });
    const rows = db.prepare(`
      SELECT key, value
      FROM ItemTable
      WHERE key LIKE '%composer%'
         OR key LIKE '%aichat%'
         OR key LIKE '%ai%'
      LIMIT 500
    `).all() as CursorRow[];

    return rows.flatMap((row) => rowToMessage(row, dbFile));
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

function rowToMessage(row: CursorRow, dbFile: string): RawMessage[] {
  const text = typeof row.value === "string" ? row.value : row.value?.toString("utf8");
  if (!text || text.length < 20) {
    return [];
  }

  const parsed = safeJson(text);
  const extracted = parsed ? extractLikelyTexts(parsed) : [text];

  return extracted
    .filter((content) => content.trim().length > 20)
    .slice(0, 100)
    .map((content, index) => ({
      sourceTool: "cursor",
      sessionId: `${basename(dbFile)}:${row.key}`,
      workspacePath: null,
      role: "unknown",
      content,
      timestamp: Date.now() + index,
    }));
}

function extractLikelyTexts(value: unknown): string[] {
  const results: string[] = [];

  function visit(current: unknown): void {
    if (typeof current === "string") {
      if (current.trim().split(/\s+/).length >= 8) {
        results.push(current);
      }
      return;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item);
      }
      return;
    }

    if (current && typeof current === "object") {
      const object = current as Record<string, unknown>;
      const role = object.role;
      const content = object.content ?? object.text ?? object.message;
      if (typeof role === "string" && typeof content === "string") {
        results.push(content);
        return;
      }

      for (const item of Object.values(object)) {
        visit(item);
      }
    }
  }

  visit(value);
  return Array.from(new Set(results));
}

function safeJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
