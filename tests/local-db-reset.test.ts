import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeCredentials, readCredentials } from "../src/cloud/client/credentials.js";
import { getOrCreateInstallIdentity, readInstallIdentity } from "../src/cloud/client/install.js";
import { getLocalStats, insertMessageWithChunks, openMimirDatabase } from "../src/local/db/sqlite.js";
import { resetLocalDatabase } from "../src/local/db/reset.js";

describe("local database reset", () => {
  it("clears local SQLite data and preserves auth files", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-reset-test-"));
    const dbPath = join(homeDir, "vault.db");
    const install = getOrCreateInstallIdentity(homeDir);
    writeCredentials(homeDir, {
      cloudUrl: "https://mimir.example.com",
      accessToken: "token-123",
      userId: "user-1",
      createdAt: 1782691200000,
    });

    const database = openMimirDatabase(dbPath);
    try {
      insertMessageWithChunks(database.db, {
        id: "message-1",
        sourceTool: "codex",
        workspacePath: "/repo",
        sessionId: "session-1",
        role: "user",
        content: "Local memory",
        timestamp: 1782691200000,
        contentHash: "message-hash-1",
      }, [{
        id: "chunk-1",
        messageId: "message-1",
        chunkIndex: 0,
        content: "Local memory",
        contentHash: "chunk-hash-1",
        embeddingProvider: "dev",
        embeddingModel: "mimir-dev-hash-v1",
        embedding: new Array(1536).fill(0),
      }]);
      expect(getLocalStats(database.db, "https://mimir.example.com")).toMatchObject({
        messages: 1,
        chunks: 1,
      });
    } finally {
      database.close();
    }

    const result = resetLocalDatabase(dbPath);

    expect(result.dbPath).toBe(dbPath);
    expect(result.deletedPaths).toContain(dbPath);
    expect(readInstallIdentity(homeDir)).toEqual(install);
    expect(readCredentials(homeDir)).toMatchObject({
      cloudUrl: "https://mimir.example.com",
      accessToken: "token-123",
      userId: "user-1",
    });
    expect(existsSync(dbPath)).toBe(true);

    const resetDb = openMimirDatabase(dbPath);
    try {
      expect(getLocalStats(resetDb.db, "https://mimir.example.com")).toMatchObject({
        messages: 0,
        chunks: 0,
        uploadedChunks: 0,
        pendingUploads: 0,
      });
    } finally {
      resetDb.close();
    }
  });

  it("succeeds when local database files do not exist", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-reset-empty-test-"));
    const dbPath = join(homeDir, "vault.db");

    const result = resetLocalDatabase(dbPath);

    expect(result.deletedPaths).toEqual([]);
    expect(existsSync(dbPath)).toBe(true);
  });
});
