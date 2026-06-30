import Database from "better-sqlite3";
import { createRequire } from "node:module";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { EMBEDDING_DIMENSIONS } from "./config.js";
import { cosineDistance, parseVector, serializeVector } from "./vector.js";

export interface StoredChunk {
  chunkId: string;
  content: string;
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  role: string;
  timestamp: number;
  distance: number;
}

export interface SearchChunkOptions {
  sourceTool?: string;
  sessionId?: string;
  workspacePath?: string;
  since?: number;
  until?: number;
}

export interface MessageInput {
  id: string;
  sourceTool: string;
  workspacePath?: string | null;
  sessionId: string;
  role: string;
  content: string;
  timestamp: number;
  contentHash: string;
}

export interface ChunkInput {
  id: string;
  messageId: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  embeddingProvider: string;
  embeddingModel: string;
  embedding: number[];
}

export interface MemoryChunkUpload {
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  role: string;
  timestamp: number;
  content: string;
  contentHash: string;
  embeddingProvider: string;
  embeddingModel: string;
  embedding: number[];
}

export interface LocalStats {
  messages: number;
  chunks: number;
  uploadedChunks: number;
  pendingUploads: number;
}

export interface MimirDatabase {
  db: Database.Database;
  vectorIndexAvailable: boolean;
  close(): void;
}

export function openMimirDatabase(dbPath: string): MimirDatabase {
  mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });

  const db = new Database(dbPath);
  chmodPrivate(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const vectorIndexAvailable = loadSqliteVec(db);
  applySchema(db, vectorIndexAvailable);

  return {
    db,
    vectorIndexAvailable,
    close() {
      db.close();
    },
  };
}

export function applySchema(db: Database.Database, vectorIndexAvailable: boolean): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      source_tool TEXT NOT NULL,
      workspace_path TEXT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      content_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL UNIQUE,
      embedding_provider TEXT NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding_json TEXT NOT NULL,
      embedded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_source_tool ON messages(source_tool);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_message_id ON chunks(message_id);

    CREATE TABLE IF NOT EXISTS upload_records (
      cloud_url TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      uploaded_at INTEGER NOT NULL,
      PRIMARY KEY (cloud_url, content_hash)
    );
  `);

  if (vectorIndexAvailable) {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
        embedding float[${EMBEDDING_DIMENSIONS}]
      );
    `);
  }

  db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)").run(
    "vector_index_available",
    vectorIndexAvailable ? "true" : "false",
  );
}

export function getLocalStats(db: Database.Database, cloudUrl: string): LocalStats {
  const messages = getCount(db, "messages");
  const chunks = getCount(db, "chunks");
  const uploadedChunks = db.prepare("SELECT COUNT(*) AS count FROM upload_records WHERE cloud_url = ?").get(cloudUrl) as { count: number };

  return {
    messages,
    chunks,
    uploadedChunks: uploadedChunks.count,
    pendingUploads: Math.max(0, chunks - uploadedChunks.count),
  };
}

export function listPendingUploadChunks(db: Database.Database, cloudUrl: string, limit: number): MemoryChunkUpload[] {
  return listUploadChunks(db, cloudUrl, limit, false);
}

export function listUploadChunks(db: Database.Database, cloudUrl: string, limit: number, includeUploaded: boolean): MemoryChunkUpload[] {
  const rows = db.prepare(`
    SELECT
      m.source_tool AS sourceTool,
      m.workspace_path AS workspacePath,
      m.session_id AS sessionId,
      m.role AS role,
      m.timestamp AS timestamp,
      c.content AS content,
      c.content_hash AS contentHash,
      c.embedding_provider AS embeddingProvider,
      c.embedding_model AS embeddingModel,
      c.embedding_json AS embeddingJson
    FROM chunks c
    JOIN messages m ON m.id = c.message_id
    LEFT JOIN upload_records u
      ON u.cloud_url = ?
     AND u.content_hash = c.content_hash
    WHERE (? = 1 OR u.content_hash IS NULL)
    ORDER BY m.timestamp ASC, c.chunk_index ASC
    LIMIT ?
  `).all(cloudUrl, includeUploaded ? 1 : 0, limit) as Array<Omit<MemoryChunkUpload, "embedding"> & { embeddingJson: string }>;

  return rows.map((row) => ({
    sourceTool: row.sourceTool,
    workspacePath: row.workspacePath,
    sessionId: row.sessionId,
    role: row.role,
    timestamp: row.timestamp,
    content: row.content,
    contentHash: row.contentHash,
    embeddingProvider: row.embeddingProvider,
    embeddingModel: row.embeddingModel,
    embedding: parseVector(row.embeddingJson),
  }));
}

export function markChunksUploaded(db: Database.Database, cloudUrl: string, contentHashes: string[]): void {
  if (contentHashes.length === 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO upload_records (cloud_url, content_hash, uploaded_at)
    VALUES (?, ?, ?)
  `);
  const uploadedAt = Date.now();

  db.transaction(() => {
    for (const contentHash of contentHashes) {
      insert.run(cloudUrl, contentHash, uploadedAt);
    }
  })();
}

export function insertMessageWithChunks(db: Database.Database, message: MessageInput, chunks: ChunkInput[]): boolean {
  const transaction = db.transaction(() => {
    const messageResult = db.prepare(`
      INSERT OR IGNORE INTO messages
        (id, source_tool, workspace_path, session_id, role, content, timestamp, content_hash)
      VALUES
        (@id, @sourceTool, @workspacePath, @sessionId, @role, @content, @timestamp, @contentHash)
    `).run({
      ...message,
      workspacePath: message.workspacePath ?? null,
    });

    if (messageResult.changes === 0) {
      return false;
    }

    const insertChunk = db.prepare(`
      INSERT OR IGNORE INTO chunks
        (id, message_id, chunk_index, content, content_hash, embedding_provider, embedding_model, embedding_json)
      VALUES
        (@id, @messageId, @chunkIndex, @content, @contentHash, @embeddingProvider, @embeddingModel, @embeddingJson)
    `);

    const insertVector = hasUsableVecChunks(db)
      ? db.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)")
      : null;

    for (const chunk of chunks) {
      const chunkResult = insertChunk.run({
        id: chunk.id,
        messageId: chunk.messageId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        contentHash: chunk.contentHash,
        embeddingProvider: chunk.embeddingProvider,
        embeddingModel: chunk.embeddingModel,
        embeddingJson: serializeVector(chunk.embedding),
      });

      if (chunkResult.changes > 0 && insertVector) {
        const row = db.prepare("SELECT rowid FROM chunks WHERE id = ?").get(chunk.id) as { rowid: number } | undefined;
        const rowid = row ? Number(row.rowid) : Number.NaN;
        if (Number.isSafeInteger(rowid)) {
          try {
            insertVector.run(rowid, serializeVector(chunk.embedding));
          } catch {
            // Keep the relational row and JSON vector; search will use the fallback path.
          }
        }
      }
    }

    return true;
  });

  return transaction();
}

export function searchChunks(
  db: Database.Database,
  queryEmbedding: number[],
  limit: number,
  options: SearchChunkOptions = {},
): StoredChunk[] {
  if (hasUsableVecChunks(db)) {
    try {
      const rows = db.prepare(`
        SELECT
          c.id AS chunkId,
          c.content AS content,
          m.source_tool AS sourceTool,
          m.workspace_path AS workspacePath,
          m.session_id AS sessionId,
          m.role AS role,
          m.timestamp AS timestamp,
          v.distance AS distance
        FROM vec_chunks v
        JOIN chunks c ON c.rowid = v.rowid
        JOIN messages m ON m.id = c.message_id
        WHERE v.embedding MATCH ?
          AND (? IS NULL OR m.source_tool = ?)
          AND (? IS NULL OR m.session_id = ?)
          AND (? IS NULL OR m.workspace_path = ?)
          AND (? IS NULL OR m.timestamp >= ?)
          AND (? IS NULL OR m.timestamp <= ?)
        ORDER BY v.distance
        LIMIT ?
      `).all(
        serializeVector(queryEmbedding),
        options.sourceTool ?? null,
        options.sourceTool ?? null,
        options.sessionId ?? null,
        options.sessionId ?? null,
        options.workspacePath ?? null,
        options.workspacePath ?? null,
        options.since ?? null,
        options.since ?? null,
        options.until ?? null,
        options.until ?? null,
        limit,
      ) as StoredChunk[];

      return rows;
    } catch {
      return fallbackSearch(db, queryEmbedding, limit, options);
    }
  }

  return fallbackSearch(db, queryEmbedding, limit, options);
}

function fallbackSearch(
  db: Database.Database,
  queryEmbedding: number[],
  limit: number,
  options: SearchChunkOptions,
): StoredChunk[] {
  const rows = db.prepare(`
    SELECT
      c.id AS chunkId,
      c.content AS content,
      c.embedding_json AS embeddingJson,
      m.source_tool AS sourceTool,
      m.workspace_path AS workspacePath,
      m.session_id AS sessionId,
      m.role AS role,
      m.timestamp AS timestamp
    FROM chunks c
    JOIN messages m ON m.id = c.message_id
    WHERE (? IS NULL OR m.source_tool = ?)
      AND (? IS NULL OR m.session_id = ?)
      AND (? IS NULL OR m.workspace_path = ?)
      AND (? IS NULL OR m.timestamp >= ?)
      AND (? IS NULL OR m.timestamp <= ?)
  `).all(
    options.sourceTool ?? null,
    options.sourceTool ?? null,
    options.sessionId ?? null,
    options.sessionId ?? null,
    options.workspacePath ?? null,
    options.workspacePath ?? null,
    options.since ?? null,
    options.since ?? null,
    options.until ?? null,
    options.until ?? null,
  ) as Array<Omit<StoredChunk, "distance"> & { embeddingJson: string }>;

  return rows
    .map((row) => ({
      chunkId: row.chunkId,
      content: row.content,
      sourceTool: row.sourceTool,
      workspacePath: row.workspacePath,
      sessionId: row.sessionId,
      role: row.role,
      timestamp: row.timestamp,
      distance: cosineDistance(queryEmbedding, parseVector(row.embeddingJson)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

function hasVecChunks(db: Database.Database): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vec_chunks'").get();
  return Boolean(row);
}

function getCount(db: Database.Database, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

function hasUsableVecChunks(db: Database.Database): boolean {
  const metadata = db.prepare("SELECT value FROM metadata WHERE key = 'vector_index_available'").get() as { value: string } | undefined;
  return metadata?.value === "true" && hasVecChunks(db);
}

function loadSqliteVec(db: Database.Database): boolean {
  try {
    const require = createRequire(import.meta.url);
    const sqliteVec = require("sqlite-vec") as { load?: (database: Database.Database) => void; default?: { load?: (database: Database.Database) => void } };
    const load = sqliteVec.load ?? sqliteVec.default?.load;
    if (!load) {
      return false;
    }

    load(db);
    return true;
  } catch {
    return false;
  }
}

function chmodPrivate(path: string): void {
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best effort: Windows and some filesystems do not support POSIX permissions.
  }
}
