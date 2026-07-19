import type pg from "pg";
import type { UploadMemoryChunkDto } from "../../dto/memory.dto.js";
import type {
  CloudConversationEntry,
  CloudConversationEntryOptions,
  CloudConversationListOptions,
  CloudConversationSummary,
  CloudDashboardSummary,
  CloudMemoryExport,
  CloudKeywordSearchResult,
  CloudMemoryResult,
  CloudSearchOptions,
  CloudSearchResult,
} from "../types.js";

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
        const inserted = await client.query(`
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
        if ((inserted.rowCount ?? 0) > 0) {
          acceptedHashes.push(chunk.contentHash);
        }
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
    const [count, installs, recent, auditEvents] = await Promise.all([
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
      this.pool.query<{
        id: string;
        action: string;
        metadata: Record<string, unknown>;
        created_at: string;
      }>(`
        SELECT id::text, action, metadata, created_at::text
        FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
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
      auditEvents: auditEvents.rows.map((row) => ({
        id: row.id,
        action: row.action,
        metadata: row.metadata,
        createdAt: row.created_at,
      })),
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
        AND ($6::text IS NULL OR role = $6)
        AND ($7::timestamptz IS NULL OR occurred_at >= $7)
        AND ($8::timestamptz IS NULL OR occurred_at <= $8)
      ORDER BY embedding <=> $2::vector
      LIMIT $9
    `, [
      userId,
      vectorLiteral(embedding),
      options.sourceTool ?? null,
      options.sessionId ?? null,
      options.workspacePath ?? null,
      options.role ?? null,
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

  async listMemories(userId: string, options: CloudSearchOptions): Promise<CloudMemoryResult[]> {
    const result = await this.pool.query<CloudMemoryRow>(`
      SELECT
        id::text AS chunk_id,
        source_tool,
        workspace_path,
        session_id,
        role,
        (extract(epoch FROM occurred_at) * 1000)::bigint::text AS timestamp,
        content
      FROM memory_chunks
      WHERE user_id = $1
        AND ($2::text IS NULL OR source_tool = $2)
        AND ($3::text IS NULL OR session_id = $3)
        AND ($4::text IS NULL OR workspace_path = $4)
        AND ($5::text IS NULL OR role = $5)
        AND ($6::timestamptz IS NULL OR occurred_at >= $6)
        AND ($7::timestamptz IS NULL OR occurred_at <= $7)
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT $8
    `, [
      userId,
      options.sourceTool ?? null,
      options.sessionId ?? null,
      options.workspacePath ?? null,
      options.role ?? null,
      options.since ? new Date(options.since) : null,
      options.until ? new Date(options.until) : null,
      options.limit,
    ]);

    return result.rows.map(toCloudMemoryResult);
  }

  async keywordSearchMemories(userId: string, query: string, options: CloudSearchOptions): Promise<CloudKeywordSearchResult[]> {
    const result = await this.pool.query<CloudMemoryRow & { text_rank: string }>(`
      WITH search_query AS (
        SELECT websearch_to_tsquery('english', $2) AS value
      )
      SELECT
        id::text AS chunk_id,
        source_tool,
        workspace_path,
        session_id,
        role,
        (extract(epoch FROM occurred_at) * 1000)::bigint::text AS timestamp,
        content,
        ts_rank_cd(search_vector, search_query.value)::text AS text_rank
      FROM memory_chunks, search_query
      WHERE user_id = $1
        AND search_vector @@ search_query.value
        AND ($3::text IS NULL OR source_tool = $3)
        AND ($4::text IS NULL OR session_id = $4)
        AND ($5::text IS NULL OR workspace_path = $5)
        AND ($6::text IS NULL OR role = $6)
        AND ($7::timestamptz IS NULL OR occurred_at >= $7)
        AND ($8::timestamptz IS NULL OR occurred_at <= $8)
      ORDER BY ts_rank_cd(search_vector, search_query.value) DESC, occurred_at DESC
      LIMIT $9
    `, [
      userId,
      query,
      options.sourceTool ?? null,
      options.sessionId ?? null,
      options.workspacePath ?? null,
      options.role ?? null,
      options.since ? new Date(options.since) : null,
      options.until ? new Date(options.until) : null,
      options.limit,
    ]);

    return result.rows.map((row) => ({
      ...toCloudMemoryResult(row),
      textRank: Number.parseFloat(row.text_rank),
    }));
  }

  async listConversations(userId: string, options: CloudConversationListOptions): Promise<CloudConversationSummary[]> {
    const result = await this.pool.query<{
      source_tool: string;
      workspace_path: string | null;
      session_id: string;
      title_seed: string;
      started_at: string;
      last_activity_at: string;
      memory_count: string;
    }>(`
      WITH conversations AS (
        SELECT
          source_tool,
          session_id,
          (array_agg(workspace_path ORDER BY occurred_at DESC, created_at DESC)
            FILTER (WHERE workspace_path IS NOT NULL))[1] AS workspace_path,
          (array_agg(content ORDER BY
            CASE WHEN role = 'user' THEN 0 ELSE 1 END,
            occurred_at ASC,
            created_at ASC
          ))[1] AS title_seed,
          min(occurred_at) AS started_at,
          max(occurred_at) AS last_activity_at,
          count(*)::text AS memory_count
        FROM memory_chunks
        WHERE user_id = $1
          AND ($2::text IS NULL OR source_tool = $2)
          AND ($3::text IS NULL OR workspace_path = $3)
        GROUP BY source_tool, session_id
      )
      SELECT
        source_tool,
        workspace_path,
        session_id,
        title_seed,
        started_at::text,
        last_activity_at::text,
        memory_count
      FROM conversations
      WHERE (
        $4::timestamptz IS NULL
        OR (last_activity_at, source_tool, session_id) < ($4::timestamptz, $5::text, $6::text)
      )
      ORDER BY last_activity_at DESC, source_tool DESC, session_id DESC
      LIMIT $7
    `, [
      userId,
      options.sourceTool ?? null,
      options.workspacePath ?? null,
      options.cursor ? new Date(options.cursor.lastActivityAt) : null,
      options.cursor?.sourceTool ?? null,
      options.cursor?.sessionId ?? null,
      options.limit,
    ]);

    return result.rows.map((row) => ({
      sourceTool: row.source_tool,
      workspacePath: row.workspace_path,
      sessionId: row.session_id,
      titleSeed: row.title_seed,
      startedAt: Date.parse(row.started_at),
      lastActivityAt: Date.parse(row.last_activity_at),
      memoryCount: Number.parseInt(row.memory_count, 10),
    }));
  }

  async listConversationEntries(
    userId: string,
    sourceTool: string,
    sessionId: string,
    options: CloudConversationEntryOptions,
  ): Promise<CloudConversationEntry[]> {
    const result = await this.pool.query<CloudMemoryRow & { created_at: string }>(`
      SELECT
        id::text AS chunk_id,
        source_tool,
        workspace_path,
        session_id,
        role,
        (extract(epoch FROM occurred_at) * 1000)::bigint::text AS timestamp,
        content,
        created_at::text
      FROM memory_chunks
      WHERE user_id = $1
        AND source_tool = $2
        AND session_id = $3
        AND (
          $4::timestamptz IS NULL
          OR (occurred_at, id) > ($4::timestamptz, $5::uuid)
        )
      ORDER BY occurred_at ASC, id ASC
      LIMIT $6
    `, [
      userId,
      sourceTool,
      sessionId,
      options.cursor ? new Date(options.cursor.timestamp) : null,
      options.cursor?.chunkId ?? null,
      options.limit,
    ]);

    return result.rows.map((row) => ({
      ...toCloudMemoryResult(row),
      createdAt: row.created_at,
    }));
  }
}

interface CloudMemoryRow {
  chunk_id: string;
  source_tool: string;
  workspace_path: string | null;
  session_id: string;
  role: string;
  timestamp: string;
  content: string;
}

function toCloudMemoryResult(row: CloudMemoryRow): CloudMemoryResult {
  return {
    chunkId: row.chunk_id,
    sourceTool: row.source_tool,
    workspacePath: row.workspace_path,
    sessionId: row.session_id,
    role: row.role,
    timestamp: Number.parseInt(row.timestamp, 10),
    content: row.content,
  };
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
