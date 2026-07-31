import type { PgTestConnectionOptions } from '@pgpmjs/types';
import deepmerge from 'deepmerge';
import { getPgEnvVars, PgConfig } from 'pg-env';
import { 
  type GetConnectionOpts,
  type GetConnectionResult,
  getConnections as getPgConnections} from 'pgsql-test';

/**
 * InsForge default connection options
 */
const INSFORGE_DEFAULTS: Partial<PgTestConnectionOptions> = {
  roles: {
    anonymous: 'anon',
    authenticated: 'authenticated',
    administrator: 'project_admin',
    default: 'anon',
  },
  connections: {
    app: {
      user: 'postgres',
      password: 'postgres',
    }
  }
};

/**
 * InsForge default PostgreSQL config
 */
const INSFORGE_PG_DEFAULTS: Partial<PgConfig> = {
  port: 5432,
  user: 'postgres',
  password: 'postgres',
};

/**
 * Get connections with InsForge defaults applied.
 * Uses deepmerge for proper nested config merging.
 * 
 * Precedence (later wins):
 * 1. InsForge defaults
 * 2. Environment variables (PGUSER/PGPASSWORD)
 * 3. User-provided options
 */
export const getConnections = async (
  cn: GetConnectionOpts = {},
  seedAdapters?: Parameters<typeof getPgConnections>[1]
): Promise<GetConnectionResult> => {
  // Get environment variables (only includes defined keys)
  const pgEnvVars = getPgEnvVars();
  
  // Build env overrides - pgEnvVars already only has defined keys
  // Mirror user/password to connections.app for the app connection
  const envOverrides: Partial<GetConnectionOpts> = {
    pg: pgEnvVars,
    db: {
      connections: {
        app: {
          ...(pgEnvVars.user && { user: pgEnvVars.user }),
          ...(pgEnvVars.password && { password: pgEnvVars.password }),
        }
      }
    }
  };
  
  // Merge: InsForge defaults -> env vars -> user overrides
  const mergedOpts = deepmerge.all([
    { pg: INSFORGE_PG_DEFAULTS, db: INSFORGE_DEFAULTS },
    envOverrides,
    cn,
  ]) as GetConnectionOpts;

  return getPgConnections(mergedOpts, seedAdapters);
};

// Re-export types
export type { GetConnectionOpts, GetConnectionResult };
