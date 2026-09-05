/**
 * Events Module Loader
 *
 * Resolves the tenant's app-scoped events module from
 * metaschema_modules_public.events_module: the private schema and the name of
 * its `record_event` function, so the server can record events without
 * hard-coding the generated schema or function names.
 */

import type { EventsConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const EVENTS_MODULE_SQL = `
  SELECT
    s.schema_name AS private_schema_name,
    em.record_event
  FROM metaschema_modules_public.events_module em
  JOIN metaschema_public.schema s ON s.id = em.private_schema_id
  WHERE em.database_id = $1
    AND em.scope = 'app'
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface EventsModuleRow {
  private_schema_name: string;
  record_event: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const eventsLoader: ModuleLoader<EventsConfig> = createModuleLoader<EventsConfig>({
  name: 'events',
  ttlMs: 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;

    const result = await tenantPool.query<EventsModuleRow>(EVENTS_MODULE_SQL, [databaseId]);
    const row = result.rows[0];
    if (!row?.private_schema_name || !row.record_event) return undefined;

    return {
      privateSchemaName: row.private_schema_name,
      recordEvent: row.record_event
    };
  }
});
