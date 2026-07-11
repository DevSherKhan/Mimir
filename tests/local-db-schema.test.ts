import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getLocalStats, openMimirDatabase } from "../src/local/db/sqlite.js";

describe("local database schema names", () => {
  it("uses memory-prefixed local table names", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-schema-test-"));
    const database = openMimirDatabase(join(homeDir, "vault.db"));

    try {
      expect(tableNames(database.db)).toEqual(expect.arrayContaining([
        "memory_messages",
        "memory_chunks",
        "memory_uploads",
      ]));
      expect(tableNames(database.db)).not.toEqual(expect.arrayContaining([
        "messages",
        "chunks",
        "upload_records",
      ]));
    } finally {
      database.close();
    }
  });

  it("migrates old local table names to memory-prefixed names", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-schema-migration-test-"));
    const dbPath = join(homeDir, "vault.db");
    const oldDb = new Database(dbPath);
    oldDb.exec(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        source_tool TEXT NOT NULL,
        workspace_path TEXT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        content_hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE chunks (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE,
        embedding_provider TEXT NOT NULL,
        embedding_model TEXT NOT NULL,
        embedding_json TEXT NOT NULL,
        embedded_at INTEGER NOT NULL
      );

      CREATE TABLE upload_records (
        cloud_url TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        uploaded_at INTEGER NOT NULL,
        PRIMARY KEY (cloud_url, content_hash)
      );

      INSERT INTO messages (
        id,
        source_tool,
        workspace_path,
        session_id,
        role,
        content,
        timestamp,
        content_hash,
        created_at
      ) VALUES (
        'message-1',
        'codex',
        '/repo',
        'session-1',
        'user',
        'Old message',
        1782691200000,
        'message-hash-1',
        1782691200000
      );

      INSERT INTO chunks (
        id,
        message_id,
        chunk_index,
        content,
        content_hash,
        embedding_provider,
        embedding_model,
        embedding_json,
        embedded_at
      ) VALUES (
        'chunk-1',
        'message-1',
        0,
        'Old message',
        'chunk-hash-1',
        'dev',
        'mimir-dev-hash-v1',
        '[0,0]',
        1782691200000
      );
    `);
    oldDb.close();

    const migrated = openMimirDatabase(dbPath);
    try {
      expect(tableNames(migrated.db)).toEqual(expect.arrayContaining([
        "memory_messages",
        "memory_chunks",
        "memory_uploads",
      ]));
      expect(tableNames(migrated.db)).not.toEqual(expect.arrayContaining([
        "messages",
        "chunks",
        "upload_records",
      ]));
      expect(getLocalStats(migrated.db, "https://mimir.example.com")).toMatchObject({
        messages: 1,
        chunks: 1,
      });
    } finally {
      migrated.close();
    }
  });
});

function tableNames(db: Database.Database): string[] {
  return db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
  `).all().map((row) => (row as { name: string }).name);
}
