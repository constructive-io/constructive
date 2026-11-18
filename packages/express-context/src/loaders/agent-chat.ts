/**
 * Agent Chat Module Loader
 *
 * Resolves the schema and table names of a database's org-scoped agent
 * threads, messages and tasks.
 *
 * Read through `function_resolution.agent_module_registrations`: the server
 * resolves this on its own connection, as a login row-level security holds to
 * nothing, so a plain read of the registrations answers no rows.
 *
 * A database registers the agent module once per scope. The chat routes write
 * an `entity_id` on every thread (`/v1/orgs/:entity_id/threads`), which only
 * the org scope's tables carry, so that is the registration resolved here.
 */

import type { AgentChatConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const AGENT_CHAT_SCOPE = 'org';

const AGENT_CHAT_MODULE_SQL = `
  SELECT
    public_schema AS schema_name,
    thread_table_name,
    message_table_name,
    task_table_name
  FROM function_resolution.agent_module_registrations($1)
  WHERE scope = $2
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
      [databaseId, AGENT_CHAT_SCOPE],
    );
    if (result.rows.length > 1) {
      throw new Error(
        `agentChat: database ${databaseId} registers ${result.rows.length} agent modules at the ${AGENT_CHAT_SCOPE} scope`
      );
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
