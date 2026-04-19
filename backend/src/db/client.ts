import { Pool, PoolConfig } from 'pg';

/**
 * Build pool configuration from environment variables.
 * Supports DATABASE_URL or individual PG_* variables.
 */
function buildPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    };
  }

  return {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'quest_stellar',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  };
}

/** Singleton database pool instance. */
let pool: Pool | null = null;

/**
 * Returns the shared Pool instance, creating it on first call.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  return pool;
}

/**
 * Gracefully shut down the pool (call on process exit).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
