import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { writeCredentials } from "../src/cloud/client/credentials.js";
import {
  getLocalStats,
  insertMessageWithChunks,
  listPendingUploadChunks,
  markChunksUploaded,
  openMimirDatabase,
} from "../src/local/db/sqlite.js";
import { uploadPendingChunks, type UploadProgress } from "../src/cloud/client/upload.js";

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
        force: false,
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

      await expect(uploadPendingChunks({
        homeDir,
        db: database.db,
        limit: 10,
        batchSize: 10,
        dryRun: true,
        force: true,
      })).resolves.toEqual({
        cloudUrl: "https://mimir.example.com",
        selected: 1,
        uploaded: 0,
        dryRun: true,
      });
    } finally {
      database.close();
    }
  });

  it("reports initial and completed progress for every uploaded batch", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "mimir-upload-progress-test-"));
    const database = openMimirDatabase(join(homeDir, "vault.db"));

    try {
      writeCredentials(homeDir, {
        cloudUrl: "https://mimir.example.com",
        accessToken: "token-123",
        createdAt: Date.now(),
      });

      insertMessageWithChunks(database.db, {
        id: "message-progress",
        sourceTool: "codex",
        workspacePath: "/repo",
        sessionId: "session-progress",
        role: "user",
        content: "Three sanitized chunks",
        timestamp: 1782691200000,
        contentHash: "message-progress-hash",
      }, [0, 1, 2].map((chunkIndex) => ({
        id: `chunk-progress-${chunkIndex}`,
        messageId: "message-progress",
        chunkIndex,
        content: `Sanitized content ${chunkIndex}`,
        contentHash: `chunk-progress-hash-${chunkIndex}`,
        embeddingProvider: "dev",
        embeddingModel: "mimir-dev-hash-v1",
        embedding: new Array(1536).fill(0),
      })));

      vi.stubGlobal("fetch", vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { chunks: Array<{ contentHash: string }> };
        return new Response(JSON.stringify({
          accepted: body.chunks.length,
          acceptedContentHashes: body.chunks.map((chunk) => chunk.contentHash),
        }), { status: 200 });
      }));

      const progress: UploadProgress[] = [];
      await expect(uploadPendingChunks({
        homeDir,
        db: database.db,
        limit: 10,
        batchSize: 2,
        dryRun: false,
        force: false,
        onProgress: (update) => progress.push(update),
      })).resolves.toMatchObject({
        selected: 3,
        uploaded: 3,
      });

      expect(progress).toEqual([
        { processed: 0, total: 3, uploaded: 0, completedBatches: 0, totalBatches: 2 },
        { processed: 2, total: 3, uploaded: 2, completedBatches: 1, totalBatches: 2 },
        { processed: 3, total: 3, uploaded: 3, completedBatches: 2, totalBatches: 2 },
      ]);
    } finally {
      vi.unstubAllGlobals();
      database.close();
    }
  });
});
