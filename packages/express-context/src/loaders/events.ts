/**
 * Events Module Loader
 *
 * Resolves the tenant's app-scoped events module through the database's
 * login-only reader `function_resolution.events_entry`: the private schema and the names of
 * its `record_event` and `record_error` functions, so the server can record
 * events without hard-coding the generated schema or function names.
 */

import type { EventsConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const EVENTS_MODULE_SQL = `
  SELECT private_schema_name, record_event, record_error
  FROM function_resolution.events_entry($1)
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface EventsModuleRow {
  private_schema_name: string;
  record_event: string;
  record_error: string | null;
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
      recordEvent: row.record_event,
      recordError: row.record_error ?? null
    };
  }
});
