import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type pg from "pg";

const MIGRATIONS_DIR = join(process.cwd(), "cloud", "migrations");

export async function runCloudMigrations(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  for (const fileName of ["001_init.sql", "002_device_login_hardening.sql"]) {
    await runMigration(pool, fileName);
  }
}

async function runMigration(pool: pg.Pool, fileName: string): Promise<void> {
  const version = fileName.replace(/\.sql$/, "");
  const applied = await pool.query<{ version: string }>(
    "SELECT version FROM schema_migrations WHERE version = $1",
    [version],
  );

  if (applied.rowCount && applied.rowCount > 0) {
    return;
  }

  const sql = await readFile(join(MIGRATIONS_DIR, fileName), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
