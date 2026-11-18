/**
 * Agent Chat Module Loader
 *
 * Resolves the agent conversation tables a database's chat routes write to:
 * one registration per entity scope (`org`, and each entity type that installs
 * agents), with the memberships table that says which entities belong to it.
 *
 * A database registers the agent module once per scope, and the chat routes
 * name an entity, not a scope. The route resolves the entity to its scope by
 * reading these memberships tables as the request's own role, so the scope is
 * never guessed here. Scopes with no entity key (`app`, `platform`) or keyed by
 * the database carry no entity to resolve and are left out.
 *
 * Read through the database's login-only readers: the server resolves this on
 * its own connection, as a login row-level security holds to nothing, so a
 * plain read of the registrations answers no rows.
 */

import type { AgentChatConfig, AgentChatScope } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const AGENT_CHAT_MODULE_SQL = `
  SELECT
    a.scope,
    a.entity_field,
    a.public_schema AS schema_name,
    a.thread_table_name,
    a.message_table_name,
    a.task_table_name,
    m.public_schema AS memberships_schema_name,
    m.memberships_table_name,
    m.entity_field AS memberships_entity_field
  FROM function_resolution.agent_module_registrations($1) a
  JOIN function_resolution.memberships_module_registrations($1) m ON m.scope = a.scope
  WHERE a.entity_field IS NOT NULL
    AND m.entity_field IS NOT NULL
  ORDER BY a.scope
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface AgentChatModuleRow {
  scope: string;
  entity_field: string;
  schema_name: string;
  thread_table_name: string | null;
  message_table_name: string | null;
  task_table_name: string | null;
  memberships_schema_name: string;
  memberships_table_name: string;
  memberships_entity_field: string;
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
    if (result.rows.length === 0) return undefined;

    const scopes: AgentChatScope[] = [];
    for (const row of result.rows) {
      // Two agent modules (or two memberships modules) at one scope leave an
      // entity of that scope with two homes; nothing in a route picks one.
      if (scopes.some((s) => s.scope === row.scope)) {
        throw new Error(
          `agentChat: database ${databaseId} registers more than one agent or memberships module at the ${row.scope} scope`
        );
      }
      scopes.push({
        scope: row.scope,
        entityField: row.entity_field,
        schemaName: row.schema_name,
        threadTableName: row.thread_table_name,
        messageTableName: row.message_table_name,
        taskTableName: row.task_table_name,
        membershipsSchemaName: row.memberships_schema_name,
        membershipsTableName: row.memberships_table_name,
        membershipsEntityField: row.memberships_entity_field,
      });
    }
    return { scopes };
  },
});
