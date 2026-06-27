import { 
  getConnections as getPgConnections,
  type GetConnectionOpts,
  type GetConnectionResult
} from 'pgsql-test';

/**
 * Get connections with Constructive platform behavior.
 * 
 * Delegates entirely to pgsql-test's getConnections (which already
 * resolves pgpmDefaults + config file + env vars + overrides via
 * getConnEnvOptions), then wraps the returned `db` client so that
 * every `setContext()` call auto-derives `jwt.claims.principal_id`
 * from `jwt.claims.user_id` when the caller hasn't set it explicitly.
 */
export const getConnections = async (
  cn: GetConnectionOpts = {},
  seedAdapters?: Parameters<typeof getPgConnections>[1]
): Promise<GetConnectionResult> => {
  const result = await getPgConnections(cn, seedAdapters);

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
