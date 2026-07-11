import type pg from "pg";
import type { UploadMemoryChunkDto } from "../../dto/memory.dto.js";
import type { CloudDashboardSummary, CloudMemoryExport, CloudSearchOptions, CloudSearchResult } from "../types.js";

export class CloudMemoryRepository {
  constructor(private readonly pool: pg.Pool) {}

  async insertMemoryBatch(userId: string, chunks: UploadMemoryChunkDto[]): Promise<string[]> {
    if (chunks.length === 0) {
      return [];
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [userId]);

      const acceptedHashes: string[] = [];
      for (const chunk of chunks) {
        await client.query(`
          INSERT INTO memory_chunks (
            user_id,
            source_tool,
            workspace_path,
            session_id,
            role,
            occurred_at,
            content,
            content_hash,
            embedding_provider,
            embedding_model,
            embedding
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            to_timestamp($6 / 1000.0),
            $7,
            $8,
            $9,
            $10,
            $11::vector
          )
          ON CONFLICT (user_id, content_hash) DO NOTHING
        `, [
          userId,
          chunk.sourceTool,
          chunk.workspacePath,
          chunk.sessionId,
          chunk.role,
          chunk.timestamp,
          chunk.content,
          chunk.contentHash,
          chunk.embeddingProvider,
          chunk.embeddingModel,
          vectorLiteral(chunk.embedding),
        ]);
        acceptedHashes.push(chunk.contentHash);
      }

      await client.query("COMMIT");
      return acceptedHashes;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async countMemories(userId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM memory_chunks WHERE user_id = $1",
      [userId],
    );
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  }

  async deleteMemories(userId: string): Promise<number> {
    const result = await this.pool.query(
      "DELETE FROM memory_chunks WHERE user_id = $1",
      [userId],
    );
    return result.rowCount ?? 0;
  }

  async exportMemories(userId: string): Promise<CloudMemoryExport[]> {
    const result = await this.pool.query<MemoryExportRow>(`
      SELECT
        id::text,
        source_tool,
        workspace_path,
        session_id,
        role,
        (extract(epoch FROM occurred_at) * 1000)::bigint::text AS timestamp,
        content,
        content_hash,
        embedding_provider,
        embedding_model,
        created_at::text
      FROM memory_chunks
      WHERE user_id = $1
      ORDER BY occurred_at DESC, created_at DESC
    `, [userId]);

    return result.rows.map(toMemoryExport);
  }

  async getDashboardSummary(userId: string): Promise<CloudDashboardSummary> {
    const [count, installs, recent] = await Promise.all([
      this.countMemories(userId),
      this.pool.query<{
        install_id: string;
        created_at: string;
        last_seen_at: string;
      }>(`
        SELECT install_id, created_at::text, last_seen_at::text
        FROM install_identities
        WHERE user_id = $1
        ORDER BY last_seen_at DESC
      `, [userId]),
      this.pool.query<MemoryExportRow>(`
        SELECT
          id::text,
          source_tool,
          workspace_path,
          session_id,
          role,
          (extract(epoch FROM occurred_at) * 1000)::bigint::text AS timestamp,
          content,
          content_hash,
          embedding_provider,
          embedding_model,
          created_at::text
        FROM memory_chunks
        WHERE user_id = $1
        ORDER BY occurred_at DESC, created_at DESC
        LIMIT 12
      `, [userId]),
    ]);

    return {
      userId,
      memoryCount: count,
      installIdentities: installs.rows.map((row) => ({
        installId: row.install_id,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
      })),
      recentMemories: recent.rows.map(toMemoryExport),
    };
  }

  async searchMemories(userId: string, embedding: number[], options: CloudSearchOptions): Promise<CloudSearchResult[]> {
    const result = await this.pool.query<{
      chunk_id: string;
      source_tool: string;
      workspace_path: string | null;
      session_id: string;
      role: string;
      timestamp: string;
      distance: string;
      content: string;
    }>(`
      SELECT
        id::text AS chunk_id,
        source_tool,
        workspace_path,
        session_id,
        role,
        (extract(epoch FROM occurred_at) * 1000)::bigint::text AS timestamp,
        (embedding <=> $2::vector)::text AS distance,
        content
      FROM memory_chunks
      WHERE user_id = $1
        AND ($3::text IS NULL OR source_tool = $3)
        AND ($4::text IS NULL OR session_id = $4)
        AND ($5::text IS NULL OR workspace_path = $5)
        AND ($6::timestamptz IS NULL OR occurred_at >= $6)
        AND ($7::timestamptz IS NULL OR occurred_at <= $7)
      ORDER BY embedding <=> $2::vector
      LIMIT $8
    `, [
      userId,
      vectorLiteral(embedding),
      options.sourceTool ?? null,
      options.sessionId ?? null,
      options.workspacePath ?? null,
      options.since ? new Date(options.since) : null,
      options.until ? new Date(options.until) : null,
      options.limit,
    ]);

    return result.rows.map((row) => ({
      chunkId: row.chunk_id,
      sourceTool: row.source_tool,
      workspacePath: row.workspace_path,
      sessionId: row.session_id,
      role: row.role,
      timestamp: Number.parseInt(row.timestamp, 10),
      distance: Number.parseFloat(row.distance),
      content: row.content,
    }));
  }
}

interface MemoryExportRow {
  id: string;
  source_tool: string;
  workspace_path: string | null;
  session_id: string;
  role: string;
  timestamp: string;
  content: string;
  content_hash: string;
  embedding_provider: string;
  embedding_model: string;
  created_at: string;
}

function toMemoryExport(row: MemoryExportRow): CloudMemoryExport {
  return {
    id: row.id,
    sourceTool: row.source_tool,
    workspacePath: row.workspace_path,
    sessionId: row.session_id,
    role: row.role,
    timestamp: Number.parseInt(row.timestamp, 10),
    content: row.content,
    contentHash: row.content_hash,
    embeddingProvider: row.embedding_provider,
    embeddingModel: row.embedding_model,
    createdAt: row.created_at,
  };
}

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
