import type BetterSqlite3 from "better-sqlite3";
import { chunkText } from "../core/chunk.js";
import type { EmbeddingProvider } from "../core/embeddings/provider.js";
import { sha256 } from "../core/hash.js";
import { readClaudeMessages } from "./ingest/claude.js";
import { readCodexMessages } from "./ingest/codex.js";
import { readCursorMessages } from "./ingest/cursor.js";
import { readFixtureMessages } from "./ingest/fixtures.js";
import type { IngestOptions, RawMessage } from "./ingest/types.js";
import { insertMessageWithChunks } from "./db/sqlite.js";
import { redactSecrets } from "../core/security/redact.js";

export interface SyncResult {
  discovered: number;
  insertedMessages: number;
  insertedChunks: number;
}

export async function syncMessages(db: BetterSqlite3.Database, provider: EmbeddingProvider, options: IngestOptions): Promise<SyncResult> {
  const rawMessages = collectMessages(options);
  let insertedMessages = 0;
  let insertedChunks = 0;

  for (const raw of rawMessages) {
    const sanitized = sanitizeMessage(raw);
    const chunks = chunkText(sanitized.content);
    if (chunks.length === 0) {
      continue;
    }

    const messageHash = sha256([
      sanitized.sourceTool,
      sanitized.sessionId,
      sanitized.role,
      sanitized.timestamp,
      sanitized.content,
    ].join("\n"));
    const messageId = `${sanitized.sourceTool}:${messageHash}`;

    const chunkInputs = [];
    for (const chunk of chunks) {
      const chunkHash = sha256(`${messageId}:${chunk.index}:${chunk.content}`);
      const embedding = await provider.embed(chunk.content);
      chunkInputs.push({
        id: `chunk:${chunkHash}`,
        messageId,
        chunkIndex: chunk.index,
        content: chunk.content,
        contentHash: chunkHash,
        embeddingProvider: provider.name,
        embeddingModel: provider.model,
        embedding,
      });
    }

    const inserted = insertMessageWithChunks(db, {
      id: messageId,
      sourceTool: sanitized.sourceTool,
      workspacePath: sanitized.workspacePath,
      sessionId: sanitized.sessionId,
      role: sanitized.role,
      content: sanitized.content,
      timestamp: sanitized.timestamp,
      contentHash: messageHash,
    }, chunkInputs);

    if (inserted) {
      insertedMessages += 1;
      insertedChunks += chunkInputs.length;
    }
  }

  return {
    discovered: rawMessages.length,
    insertedMessages,
    insertedChunks,
  };
}

function collectMessages(options: IngestOptions): RawMessage[] {
  const messages: RawMessage[] = [];

  if (options.includeClaude) {
    messages.push(...readClaudeMessages(options.claudeDir));
  }

  if (options.includeCodex) {
    messages.push(...readCodexMessages(options.codexDir));
  }

  if (options.includeCursor) {
    messages.push(...readCursorMessages(options.cursorDir));
  }

  if (options.includeFixtures) {
    messages.push(...readFixtureMessages(options.fixtureDir));
  }

  return messages;
}

function sanitizeMessage(message: RawMessage): RawMessage {
  return {
    ...message,
    role: normalizeRole(message.role),
    content: redactSecrets(message.content).trim(),
  };
}

function normalizeRole(role: string): string {
  const normalized = role.toLowerCase();
  if (["user", "assistant", "system", "tool"].includes(normalized)) {
    return normalized;
  }

  return "unknown";
}
