import { createHash, randomUUID } from "node:crypto";
import type pg from "pg";
import type { DeviceLoginApproval, DeviceLoginComplete, DeviceLoginStart } from "../types.js";

export class CloudAuthRepository {
  constructor(private readonly pool: pg.Pool) {}

  async startDeviceLogin(baseUrl: string, installId: string, clientName = "mimir-cli"): Promise<DeviceLoginStart> {
    const deviceCode = randomUUID();
    const userCode = createUserCode();
    const expiresIn = 900;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const userId = await this.userIdForInstall(installId);
    await this.pool.query(`
      INSERT INTO device_auth_codes (device_code, user_code, client_name, install_id, approved_user_id, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [deviceCode, userCode, clientName, installId, userId, expiresAt]);

    return {
      deviceCode,
      userCode,
      verificationUri: `${baseUrl}/device?code=${encodeURIComponent(userCode)}`,
      interval: 2,
      expiresIn,
    };
  }

  async approveDeviceLogin(deviceCode: string): Promise<DeviceLoginApproval> {
    const result = await this.pool.query<{ device_code: string }>(`
      SELECT device_code
      FROM device_auth_codes
      WHERE (device_code = $1 OR user_code = upper($1))
        AND expires_at > now()
        AND approved_at IS NULL
        AND consumed_at IS NULL
    `, [deviceCode]);

    const code = result.rows[0]?.device_code;
    if (!code) {
      throw new Error("Invalid or expired login code.");
    }

    await this.pool.query(`
      UPDATE device_auth_codes
      SET approved_at = now()
      WHERE device_code = $1
        AND approved_at IS NULL
        AND consumed_at IS NULL
    `, [code]);

    const approved = await this.pool.query<{ approved_user_id: string }>(
      "SELECT approved_user_id FROM device_auth_codes WHERE device_code = $1",
      [code],
    );
    const userId = approved.rows[0]?.approved_user_id;
    if (!userId) {
      throw new Error("Login code is missing a user identity.");
    }

    return { userId };
  }

  async completeDeviceLogin(deviceCode: string): Promise<DeviceLoginComplete | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{
        approved_user_id: string | null;
        access_token_hash: string | null;
      }>(`
        SELECT approved_user_id, access_token_hash
        FROM device_auth_codes
        WHERE device_code = $1
          AND expires_at > now()
          AND consumed_at IS NULL
        FOR UPDATE
      `, [deviceCode]);

      const row = result.rows[0];
      if (!row?.approved_user_id || row.access_token_hash) {
        await client.query("COMMIT");
        return null;
      }

      const accessToken = `mimir_${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
      const tokenHash = sha256(accessToken);
      await client.query(`
        INSERT INTO access_tokens (token_hash, user_id)
        VALUES ($1, $2)
      `, [tokenHash, row.approved_user_id]);
      await client.query(`
        UPDATE device_auth_codes
        SET access_token_hash = $1, consumed_at = now()
        WHERE device_code = $2
      `, [tokenHash, deviceCode]);
      await client.query("COMMIT");

      return {
        accessToken,
        userId: row.approved_user_id,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async userIdForBearerToken(token: string, env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
    const devUserId = userIdForDevToken(token, env);
    if (devUserId) {
      return devUserId;
    }

    const result = await this.pool.query<{ user_id: string }>(`
      SELECT user_id
      FROM access_tokens
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    `, [sha256(token)]);

    return result.rows[0]?.user_id ?? null;
  }

  private async userIdForInstall(installId: string): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{ user_id: string }>(`
        SELECT user_id
        FROM install_identities
        WHERE install_id = $1
        FOR UPDATE
      `, [installId]);

      const existingUserId = existing.rows[0]?.user_id;
      if (existingUserId) {
        await client.query(
          "UPDATE install_identities SET last_seen_at = now() WHERE install_id = $1",
          [installId],
        );
        await client.query("COMMIT");
        return existingUserId;
      }

      const userId = `user_${randomUUID()}`;
      await client.query("INSERT INTO users (id) VALUES ($1)", [userId]);
      await client.query(`
        INSERT INTO install_identities (install_id, user_id)
        VALUES ($1, $2)
      `, [installId, userId]);
      await client.query("COMMIT");
      return userId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export function userIdForDevToken(token: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const expectedToken = env.MIMIR_DEV_ACCESS_TOKEN ?? "dev-token";
  if (token !== expectedToken) {
    return null;
  }

  return env.MIMIR_DEV_USER_ID ?? "dev-user";
}

function createUserCode(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
