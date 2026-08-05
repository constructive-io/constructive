/**
 * Agent Chat Module Loader
 *
 * Resolves per-database agent chat config from metaschema_modules_public.agent_chat_module.
 * Returns the schema and table names for threads, messages, and tasks.
 *
 * Keyed by `database_id` like every other module lookup: one serving database
 * holds several tenants' schemas, so an unkeyed discovery resolves a
 * neighbouring tenant's tables instead of failing.
 */

import type { AgentChatConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const AGENT_CHAT_MODULE_SQL = `
  SELECT
    s.schema_name,
    acm.thread_table_name,
    acm.message_table_name,
    acm.task_table_name
  FROM metaschema_modules_public.agent_chat_module acm
  JOIN metaschema_public.schema s
    ON s.id = acm.schema_id
   AND s.database_id = acm.database_id
  WHERE acm.database_id = $1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface AgentChatModuleRow {
  schema_name: string;
  thread_table_name: string | null;
  message_table_name: string | null;
  task_table_name: string | null;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const agentChatLoader: ModuleLoader<AgentChatConfig> = createModuleLoader<AgentChatConfig>({
  name: 'agentChat',
  ttlMs: 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;
    requireDatabaseId(databaseId, 'agentChat');

    const result = await tenantPool.query<AgentChatModuleRow>(
      AGENT_CHAT_MODULE_SQL,
      [databaseId],
    );
    if (result.rows.length > 1) {
      throw new Error('Ambiguous agent chat module configuration');
    }
    const row = result.rows[0];
    if (!row) return undefined;

    return {
      schemaName: row.schema_name,
      threadTableName: row.thread_table_name,
      messageTableName: row.message_table_name,
      taskTableName: row.task_table_name,
    };
  },
});
