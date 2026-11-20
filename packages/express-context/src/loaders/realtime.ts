import { createModuleLoader } from './create-loader';
import { requireDatabaseId } from './types';

export const realtimeLoader = createModuleLoader<{ schemaName: string }>({
  name: 'realtimeModule',
  ttlMs: 60_000,
  async resolve(ctx) {
    requireDatabaseId(ctx.databaseId, 'realtimeModule');
    const { rows } = await ctx.tenantPool.query<{ public_schema: string | null }>(
      'SELECT public_schema FROM function_resolution.realtime_module_registrations($1)',
      [ctx.databaseId]
    );
    if (rows.length === 0) return undefined;
    if (rows.length !== 1 || !rows[0].public_schema) {
      throw new Error(`Invalid realtime module registration for database ${ctx.databaseId}`);
    }
    return { schemaName: rows[0].public_schema };
  }
});
