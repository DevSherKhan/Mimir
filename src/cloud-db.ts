import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import type { MemoryChunkUpload } from "./db.js";

const { Pool } = pg;

const EMBEDDING_DIMENSIONS = 1536;

let pool: pg.Pool | null = null;
let schemaReady: Promise<void> | null = null;

export interface CloudDatabase {
  startDeviceLogin(baseUrl: string): Promise<DeviceLoginStart>;
  approveDeviceLogin(deviceCode: string): Promise<DeviceLoginApproval>;
  completeDeviceLogin(deviceCode: string): Promise<DeviceLoginComplete | null>;
  insertMemoryBatch(userId: string, chunks: MemoryChunkUpload[]): Promise<string[]>;
  countMemories(userId: string): Promise<number>;
}

export interface DeviceLoginStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

export interface DeviceLoginApproval {
  userId: string;
}

export interface DeviceLoginComplete {
  accessToken: string;
  userId: string;
}

export function createCloudDatabase(databaseUrl = process.env.DATABASE_URL): CloudDatabase | null {
  if (!databaseUrl) {
    return null;
  }

  pool ??= new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });

  return {
    async startDeviceLogin(baseUrl) {
      await ensureSchema(pool!);
      const deviceCode = randomUUID();
      const userCode = createUserCode();
      const expiresIn = 900;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await pool!.query(`
        INSERT INTO device_auth_codes (device_code, user_code, expires_at)
        VALUES ($1, $2, $3)
      `, [deviceCode, userCode, expiresAt]);

      return {
        deviceCode,
        userCode,
        verificationUri: `${baseUrl}/device?code=${encodeURIComponent(userCode)}`,
        interval: 2,
        expiresIn,
      };
    },

    async approveDeviceLogin(deviceCode) {
      await ensureSchema(pool!);
      const result = await pool!.query<{ device_code: string }>(`
        SELECT device_code
        FROM device_auth_codes
        WHERE (device_code = $1 OR user_code = upper($1))
          AND expires_at > now()
      `, [deviceCode]);

      const code = result.rows[0]?.device_code;
      if (!code) {
        throw new Error("Invalid or expired login code.");
      }

      const userId = `user_${randomUUID()}`;
      await pool!.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [userId]);
      await pool!.query(`
        UPDATE device_auth_codes
        SET approved_user_id = $1, approved_at = now()
        WHERE device_code = $2
      `, [userId, code]);

      return { userId };
    },

    async completeDeviceLogin(deviceCode) {
      await ensureSchema(pool!);
      const result = await pool!.query<{
        approved_user_id: string | null;
        access_token_hash: string | null;
      }>(`
        SELECT approved_user_id, access_token_hash
        FROM device_auth_codes
        WHERE device_code = $1
          AND expires_at > now()
      `, [deviceCode]);

      const row = result.rows[0];
      if (!row?.approved_user_id) {
        return null;
      }

      if (row.access_token_hash) {
        return null;
      }

      const accessToken = `mimir_${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
      const tokenHash = sha256(accessToken);
      await pool!.query(`
        INSERT INTO access_tokens (token_hash, user_id)
        VALUES ($1, $2)
      `, [tokenHash, row.approved_user_id]);
      await pool!.query(`
        UPDATE device_auth_codes
        SET access_token_hash = $1
        WHERE device_code = $2
      `, [tokenHash, deviceCode]);

      return {
        accessToken,
        userId: row.approved_user_id,
      };
    },

    async insertMemoryBatch(userId, chunks) {
      await ensureSchema(pool!);
      const validChunks = chunks.filter(isValidMemoryChunk);
      if (validChunks.length === 0) {
        return [];
      }

      const client = await pool!.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [userId]);

        const acceptedHashes: string[] = [];
        for (const chunk of validChunks) {
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
    },

    async countMemories(userId) {
      await ensureSchema(pool!);
      const result = await pool!.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM memory_chunks WHERE user_id = $1",
        [userId],
      );
      return Number.parseInt(result.rows[0]?.count ?? "0", 10);
    },
  };
}

export function userIdForToken(token: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const expectedToken = env.MIMIR_DEV_ACCESS_TOKEN ?? "dev-token";
  if (token !== expectedToken) {
    return null;
  }

  return env.MIMIR_DEV_USER_ID ?? "dev-user";
}

export async function userIdForBearerToken(token: string, database: CloudDatabase | null, env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  const devUserId = userIdForToken(token, env);
  if (devUserId) {
    return devUserId;
  }

  if (!database || !pool) {
    return null;
  }

  await ensureSchema(pool);
  const result = await pool.query<{ user_id: string }>(`
    SELECT user_id
    FROM access_tokens
    WHERE token_hash = $1
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  `, [sha256(token)]);

  return result.rows[0]?.user_id ?? null;
}

function ensureSchema(activePool: pg.Pool): Promise<void> {
  schemaReady ??= activePool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS memory_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_tool TEXT NOT NULL,
      workspace_path TEXT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      embedding_provider TEXT NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding vector(${EMBEDDING_DIMENSIONS}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, content_hash)
    );

    CREATE TABLE IF NOT EXISTS device_auth_codes (
      device_code TEXT PRIMARY KEY,
      user_code TEXT NOT NULL UNIQUE,
      approved_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      approved_at TIMESTAMPTZ,
      access_token_hash TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS access_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_source
      ON memory_chunks (user_id, source_tool);

    CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_occurred
      ON memory_chunks (user_id, occurred_at DESC);

    CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding
      ON memory_chunks USING ivfflat (embedding vector_cosine_ops);
  `).then(() => undefined);

  return schemaReady;
}

function isValidMemoryChunk(chunk: MemoryChunkUpload): boolean {
  return typeof chunk.sourceTool === "string"
    && typeof chunk.sessionId === "string"
    && typeof chunk.role === "string"
    && typeof chunk.timestamp === "number"
    && typeof chunk.content === "string"
    && typeof chunk.contentHash === "string"
    && typeof chunk.embeddingProvider === "string"
    && typeof chunk.embeddingModel === "string"
    && Array.isArray(chunk.embedding)
    && chunk.embedding.length === EMBEDDING_DIMENSIONS
    && chunk.embedding.every((value) => Number.isFinite(value));
}

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

function shouldUseSsl(databaseUrl: string): boolean {
  return !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
}

function createUserCode(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
