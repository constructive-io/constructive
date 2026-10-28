/**
 * Platform Database Loader
 *
 * Whether a database is the platform's own: the single
 * `metaschema_public.database` row flagged `platform` (write-once, enforced
 * unique). Plugins that only make sense on the platform database's APIs are
 * loaded on this answer, never on a tenant's.
 *
 * The flag is read through the platform's resolver rather than the table,
 * whose RLS hides rows from the serving login. A deployment with no platform
 * database registered raises: there is no answer to fall back to.
 */

import type { PlatformDatabase } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

export const PLATFORM_DATABASE_SQL = `
  SELECT app_scope.platform_database_id() = $1::uuid AS platform
`;

export const platformLoader: ModuleLoader<PlatformDatabase> = createModuleLoader<PlatformDatabase>({
  name: 'platform',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    requireDatabaseId(ctx.databaseId, 'platform');
    const { rows } = await ctx.routingPool.query<{ platform: boolean }>(
      PLATFORM_DATABASE_SQL,
      [ctx.databaseId]
    );
    return { platform: rows[0]?.platform === true };
  }
});
