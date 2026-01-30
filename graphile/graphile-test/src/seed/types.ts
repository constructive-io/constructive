import type { Pool, PoolClient } from 'pg';

export interface SeedContext {
  pool: Pool;
  client: PoolClient;
}

export interface SeedAdapter {
  seed(ctx: SeedContext): Promise<void> | void;
}
