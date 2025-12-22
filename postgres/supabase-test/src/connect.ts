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
 * Environment variables take precedence over Supabase defaults.
 * User-provided options take precedence over both.
 * 
 * Note: Uses PGUSER/PGPASSWORD for both pg config and db.connections.app
 */
export const getConnections = async (
  cn: GetConnectionOpts = {},
  seedAdapters?: Parameters<typeof getPgConnections>[1]
): Promise<GetConnectionResult> => {
  // Get environment variables - these should take precedence over our defaults
  const pgEnvVars = getPgEnvVars();
  
  // Build pg config: env vars > Supabase defaults, then user overrides will override both
  const pgConfig: Partial<PgConfig> = {};
  pgConfig.port = pgEnvVars.port ?? SUPABASE_PG_DEFAULTS.port;
  pgConfig.user = pgEnvVars.user ?? SUPABASE_PG_DEFAULTS.user;
  pgConfig.password = pgEnvVars.password ?? SUPABASE_PG_DEFAULTS.password;
  
  // Build app connection config: use same user/password as pg config (from env vars or Supabase defaults)
  const appConnectionConfig = {
    user: pgConfig.user,
    password: pgConfig.password,
    ...cn.db?.connections?.app, // User overrides take precedence
  };
  
  // Build roles config: Supabase defaults, then user overrides will override
  const rolesConfig = {
    ...SUPABASE_DEFAULTS.roles,
    ...cn.db?.roles, // User overrides take precedence
  };
  
  // Build the merged options, respecting precedence: env vars > Supabase defaults > user overrides
  const mergedOpts: GetConnectionOpts = {
    pg: {
      ...pgConfig,
      ...cn.pg, // User overrides take precedence
    },
    db: {
      ...cn.db, // Other user overrides first
      connections: {
        app: appConnectionConfig,
        ...cn.db?.connections, // Preserve admin if provided
      },
      roles: rolesConfig,
    }
  };

  return getPgConnections(mergedOpts, seedAdapters);
};

// Re-export types
export type { GetConnectionOpts, GetConnectionResult };
