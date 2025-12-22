import deepmerge from 'deepmerge';
import { getPgEnvVars, PgConfig } from 'pg-env';
import { 
  getConnections as getPgConnections,
  type GetConnectionOpts,
  type GetConnectionResult
} from 'pgsql-test';
import type { PgTestConnectionOptions } from '@pgpmjs/types';

/**
 * Supabase default connection options
 */
const SUPABASE_DEFAULTS: Partial<PgTestConnectionOptions> = {
  roles: {
    anonymous: 'anon',
    authenticated: 'authenticated',
    administrator: 'service_role',
    default: 'anon',
  },
  connections: {
    app: {
      user: 'supabase_admin',
      password: 'postgres',
    }
  }
};

/**
 * Supabase default PostgreSQL config
 */
const SUPABASE_PG_DEFAULTS: Partial<PgConfig> = {
  port: 54322,
  user: 'supabase_admin',
  password: 'postgres',
};

/**
 * Get connections with Supabase defaults applied.
 * Uses deepmerge for proper nested config merging.
 * 
 * Precedence (later wins):
 * 1. Supabase defaults
 * 2. Environment variables (PGUSER/PGPASSWORD)
 * 3. User-provided options
 */
export const getConnections = async (
  cn: GetConnectionOpts = {},
  seedAdapters?: Parameters<typeof getPgConnections>[1]
): Promise<GetConnectionResult> => {
  // Get environment variables
  const pgEnvVars = getPgEnvVars();
  
  // Build env-based overrides for pg config
  const pgEnvOverrides: Partial<PgConfig> = {};
  if (pgEnvVars.port !== undefined) pgEnvOverrides.port = pgEnvVars.port;
  if (pgEnvVars.user !== undefined) pgEnvOverrides.user = pgEnvVars.user;
  if (pgEnvVars.password !== undefined) pgEnvOverrides.password = pgEnvVars.password;
  
  // Build env-based overrides for db.connections.app (use same user/password as pg)
  const dbEnvOverrides: Partial<PgTestConnectionOptions> = {};
  if (pgEnvVars.user !== undefined || pgEnvVars.password !== undefined) {
    dbEnvOverrides.connections = {
      app: {
        ...(pgEnvVars.user !== undefined && { user: pgEnvVars.user }),
        ...(pgEnvVars.password !== undefined && { password: pgEnvVars.password }),
      }
    };
  }
  
  // Merge all configs: Supabase defaults -> env vars -> user overrides
  const mergedOpts: GetConnectionOpts = deepmerge.all([
    // Supabase defaults
    {
      pg: SUPABASE_PG_DEFAULTS,
      db: SUPABASE_DEFAULTS,
    },
    // Environment variable overrides
    {
      pg: pgEnvOverrides,
      db: dbEnvOverrides,
    },
    // User-provided overrides (highest precedence)
    cn,
  ]) as GetConnectionOpts;

  return getPgConnections(mergedOpts, seedAdapters);
};

// Re-export types
export type { GetConnectionOpts, GetConnectionResult };
