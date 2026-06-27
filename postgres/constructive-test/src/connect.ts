import deepmerge from 'deepmerge';
import { getPgEnvVars, PgConfig } from 'pg-env';
import { 
  getConnections as getPgConnections,
  type GetConnectionOpts,
  type GetConnectionResult
} from 'pgsql-test';
import type { PgTestConnectionOptions } from '@pgpmjs/types';

/**
 * Constructive default connection options
 */
const CONSTRUCTIVE_DEFAULTS: Partial<PgTestConnectionOptions> = {
  roles: {
    anonymous: 'anonymous',
    authenticated: 'authenticated',
    administrator: 'administrator',
    default: 'anonymous',
  },
  connections: {
    app: {
      user: 'postgres',
      password: 'password',
    }
  }
};

/**
 * Constructive default PostgreSQL config
 */
const CONSTRUCTIVE_PG_DEFAULTS: Partial<PgConfig> = {
  port: 5432,
  user: 'postgres',
  password: 'password',
};

/**
 * Get connections with Constructive defaults applied.
 * 
 * Wraps the returned `db` client so that every `setContext()` call
 * auto-derives `jwt.claims.principal_id` from `jwt.claims.user_id`
 * when the caller hasn't set it explicitly.
 * 
 * Precedence (later wins):
 * 1. Constructive defaults
 * 2. Environment variables (PGUSER/PGPASSWORD)
 * 3. User-provided options
 */
export const getConnections = async (
  cn: GetConnectionOpts = {},
  seedAdapters?: Parameters<typeof getPgConnections>[1]
): Promise<GetConnectionResult> => {
  const pgEnvVars = getPgEnvVars();
  
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
  
  const mergedOpts = deepmerge.all([
    { pg: CONSTRUCTIVE_PG_DEFAULTS, db: CONSTRUCTIVE_DEFAULTS },
    envOverrides,
    cn,
  ]) as GetConnectionOpts;

  const result = await getPgConnections(mergedOpts, seedAdapters);

  // Auto-derive principal_id from user_id on every setContext call
  const origSetContext = result.db.setContext.bind(result.db);
  result.db.setContext = (ctx: Record<string, string | null>) => {
    if (ctx['jwt.claims.user_id'] && !('jwt.claims.principal_id' in ctx)) {
      ctx = { ...ctx, 'jwt.claims.principal_id': ctx['jwt.claims.user_id'] };
    }
    origSetContext(ctx);
  };

  return result;
};

// Re-export types
export type { GetConnectionOpts, GetConnectionResult };
