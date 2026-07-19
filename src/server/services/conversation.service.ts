import type { CloudDatabase } from "../../cloud/db/types.js";
import type { ConversationDetailQueryDto, ConversationListQueryDto } from "../../cloud/dto/memory.dto.js";
import { normalizeSourceTool } from "../../core/search.js";

interface ConversationListCursor {
  kind: "conversations";
  lastActivityAt: number;
  sourceTool: string;
  sessionId: string;
}

interface ConversationEntryCursor {
  kind: "conversation-entries";
  timestamp: number;
  chunkId: string;
}

export class ConversationCursorError extends Error {
  constructor() {
    super("Invalid conversation cursor");
    this.name = "ConversationCursorError";
  }
}

export async function listConversationPage(
  database: CloudDatabase,
  userId: string,
  input: ConversationListQueryDto,
) {
  const limit = parsePageLimit(input.limit, 20, 1, 50);
  const sourceTool = input.sourceTool ? normalizeSourceTool(input.sourceTool) : undefined;
  const cursor = input.cursor ? decodeListCursor(input.cursor) : undefined;
  const rows = await database.listConversations(userId, {
    limit: limit + 1,
    sourceTool,
    workspacePath: input.workspacePath?.trim() || undefined,
    cursor,
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);

  return {
    conversations: page.map(({ titleSeed, ...conversation }) => ({
      ...conversation,
      title: deriveConversationTitle(titleSeed),
    })),
    nextCursor: hasMore && last
      ? encodeCursor({
        kind: "conversations",
        lastActivityAt: last.lastActivityAt,
        sourceTool: last.sourceTool,
        sessionId: last.sessionId,
      })
      : null,
  };
}

export async function listConversationEntryPage(
  database: CloudDatabase,
  userId: string,
  sessionId: string,
  input: ConversationDetailQueryDto,
) {
  const limit = parsePageLimit(input.limit, 50, 1, 100);
  const sourceTool = normalizeSourceTool(input.sourceTool);
  if (!sourceTool) {
    throw new Error("sourceTool is required");
  }
  const cursor = input.cursor ? decodeEntryCursor(input.cursor) : undefined;
  const rows = await database.listConversationEntries(userId, sourceTool, sessionId, {
    limit: limit + 1,
    cursor,
  });
  const hasMore = rows.length > limit;
  const entries = rows.slice(0, limit);
  const last = entries.at(-1);

  return {
    sourceTool,
    sessionId,
    entries,
    nextCursor: hasMore && last
      ? encodeCursor({
        kind: "conversation-entries",
        timestamp: last.timestamp,
        chunkId: last.chunkId,
      })
      : null,
  };
}

export function deriveConversationTitle(content: string, maxLength = 84): string {
  const normalized = content
    .replace(/^\s*(?:#+|[-*>])\s*/u, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (!normalized) {
    return "Untitled conversation";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const candidate = normalized.slice(0, maxLength - 1);
  const wordBoundary = candidate.lastIndexOf(" ");
  const truncated = wordBoundary >= Math.floor(maxLength * 0.6)
    ? candidate.slice(0, wordBoundary)
    : candidate;
  return `${truncated}…`;
}

function parsePageLimit(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value === "undefined" || value === null || value === "") {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`limit must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function encodeCursor(cursor: ConversationListCursor | ConversationEntryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeListCursor(value: string): Omit<ConversationListCursor, "kind"> {
  const parsed = decodeCursor(value);
  if (
    parsed.kind !== "conversations"
    || !isFiniteNumber(parsed.lastActivityAt)
    || typeof parsed.sourceTool !== "string"
    || typeof parsed.sessionId !== "string"
  ) {
    throw new ConversationCursorError();
  }
  return {
    lastActivityAt: parsed.lastActivityAt,
    sourceTool: parsed.sourceTool,
    sessionId: parsed.sessionId,
  };
}

function decodeEntryCursor(value: string): Omit<ConversationEntryCursor, "kind"> {
  const parsed = decodeCursor(value);
  if (
    parsed.kind !== "conversation-entries"
    || !isFiniteNumber(parsed.timestamp)
    || typeof parsed.chunkId !== "string"
  ) {
    throw new ConversationCursorError();
  }
  return {
    timestamp: parsed.timestamp,
    chunkId: parsed.chunkId,
  };
}

function decodeCursor(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ConversationCursorError();
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ConversationCursorError) {
      throw error;
    }
    throw new ConversationCursorError();
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
