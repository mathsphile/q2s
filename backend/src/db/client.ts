import { Pool, PoolConfig } from 'pg';

/**
 * Build pool configuration from environment variables.
 * Supports DATABASE_URL or individual PG_* variables.
 * Enables SSL for cloud providers (Neon, Supabase, etc.)
 */
function buildPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: parseInt(process.env.PG_POOL_MAX || '5', 10),
      ssl: databaseUrl.includes('sslmode=require') || isProduction
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }

  const config: PoolConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'quest_stellar',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    max: parseInt(process.env.PG_POOL_MAX || '5', 10),
  };

  // Enable SSL for cloud-hosted databases
  if (isProduction || (process.env.PG_HOST && !process.env.PG_HOST.includes('localhost'))) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
