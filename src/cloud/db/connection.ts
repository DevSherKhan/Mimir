import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function createCloudPool(databaseUrl = process.env.DATABASE_URL): pg.Pool | null {
  if (!databaseUrl) {
    return null;
  }

  pool ??= new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

function shouldUseSsl(databaseUrl: string): boolean {
  return !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
}
