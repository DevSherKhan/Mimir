import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeCredentials } from "../src/auth.js";
import {
  getLocalStats,
  insertMessageWithChunks,
  listPendingUploadChunks,
  markChunksUploaded,
  openMimirDatabase,
} from "../src/db.js";
import { uploadPendingChunks } from "../src/upload.js";

describe("cloud upload queue", () => {
  it("lists pending sanitized chunks and supports dry-run upload", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-upload-test-"));
    const database = openMimirDatabase(join(homeDir, "vault.db"));

    try {
      writeCredentials(homeDir, {
        cloudUrl: "https://mimir.example.com",
        accessToken: "token-123",
        createdAt: Date.now(),
      });

      insertMessageWithChunks(database.db, {
        id: "message-1",
        sourceTool: "codex",
        workspacePath: "/repo",
        sessionId: "session-1",
        role: "user",
        content: "Sanitized content",
        timestamp: 1782691200000,
        contentHash: "message-hash-1",
      }, [{
        id: "chunk-1",
        messageId: "message-1",
        chunkIndex: 0,
        content: "Sanitized content",
        contentHash: "chunk-hash-1",
        embeddingProvider: "dev",
        embeddingModel: "mimir-dev-hash-v1",
        embedding: new Array(1536).fill(0),
      }]);

      expect(getLocalStats(database.db, "https://mimir.example.com")).toMatchObject({
        messages: 1,
        chunks: 1,
        uploadedChunks: 0,
        pendingUploads: 1,
      });

      expect(listPendingUploadChunks(database.db, "https://mimir.example.com", 10)).toEqual([{
        sourceTool: "codex",
        workspacePath: "/repo",
        sessionId: "session-1",
        role: "user",
        timestamp: 1782691200000,
        content: "Sanitized content",
        contentHash: "chunk-hash-1",
        embeddingProvider: "dev",
        embeddingModel: "mimir-dev-hash-v1",
        embedding: new Array(1536).fill(0),
      }]);

      await expect(uploadPendingChunks({
        homeDir,
        db: database.db,
        limit: 10,
        batchSize: 10,
        dryRun: true,
      })).resolves.toEqual({
        cloudUrl: "https://mimir.example.com",
        selected: 1,
        uploaded: 0,
        dryRun: true,
      });

      markChunksUploaded(database.db, "https://mimir.example.com", ["chunk-hash-1"]);
      expect(getLocalStats(database.db, "https://mimir.example.com")).toMatchObject({
        uploadedChunks: 1,
        pendingUploads: 0,
      });
    } finally {
      database.close();
    }
  });
});
