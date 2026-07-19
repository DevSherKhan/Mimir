import { createHash } from "node:crypto";
import type pg from "pg";
import type { CloudAuditEvent, CloudRateLimitDecision } from "../types.js";

export class CloudOperationsRepository {
  constructor(private readonly pool: pg.Pool) {}

  async consumeRateLimit(action: string, identifier: string, limit: number, windowMs: number): Promise<CloudRateLimitDecision> {
    const result = await this.pool.query<{
      request_count: number;
      retry_after_seconds: number;
    }>(`
      WITH current_window AS (
        SELECT to_timestamp(
          floor(extract(epoch FROM clock_timestamp()) * 1000 / $3::double precision)
          * $3::double precision / 1000
        ) AS window_start
      )
      INSERT INTO request_rate_limits (action, identifier_hash, window_start, request_count)
      SELECT $1, $2, window_start, 1
      FROM current_window
      ON CONFLICT (action, identifier_hash, window_start)
      DO UPDATE SET request_count = request_rate_limits.request_count + 1
      RETURNING
        request_count,
        greatest(
          1,
          ceil(extract(epoch FROM (
            window_start + ($3::text || ' milliseconds')::interval - clock_timestamp()
          )))::integer
        ) AS retry_after_seconds
    `, [action, sha256(identifier), windowMs]);

    const row = result.rows[0];
    const count = row?.request_count ?? limit + 1;
    return {
      allowed: count <= limit,
      retryAfterSeconds: row?.retry_after_seconds ?? Math.ceil(windowMs / 1000),
    };
  }

  async listAuditEvents(userId: string, limit: number): Promise<CloudAuditEvent[]> {
    const result = await this.pool.query<{
      id: string;
      action: string;
      metadata: Record<string, unknown>;
      created_at: string;
    }>(`
      SELECT id::text, action, metadata, created_at::text
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
