/**
 * Agent Discovery
 *
 * Discovers agent tables by querying the agent_chat_module config table
 * at runtime. The module stores schema_id, table names, and table IDs
 * when provisioned — no smart tags needed.
 *
 * Results are cached per-database with a TTL so the REST middleware
 * doesn't hit the database on every request.
 */

import { Pool } from 'pg';
import { ModuleConfigCache } from 'graphile-cache';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentTableInfo {
  /** The PostgreSQL schema name (e.g. 'agent_public') */
  schemaName: string;
  /** The table name (e.g. 'agent_thread') */
  tableName: string;
}

export interface AgentDiscovery {
  thread: AgentTableInfo | null;
  message: AgentTableInfo | null;
  task: AgentTableInfo | null;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const agentDiscoveryCache = new ModuleConfigCache<AgentDiscovery | null>({
  name: 'agent-discovery',
  ttlMs: 60_000,
});

/** Clear all cached discovery results (for testing) */
export function clearAgentDiscoveryCache(): void {
  agentDiscoveryCache.clear();
}

// ─── Discovery Query ────────────────────────────────────────────────────────

const DISCOVERY_SQL = `
  SELECT
    s.schema_name,
    acm.thread_table_name,
    acm.message_table_name,
    acm.task_table_name
  FROM metaschema_modules_public.agent_chat_module acm
  JOIN metaschema_public.schema s ON s.id = acm.schema_id
  LIMIT 1
`;

/**
 * Look up agent table info for a database, querying the module config table.
 * Results are cached per-database with a 60s TTL.
 */
export async function getAgentDiscovery(
  pool: Pool,
  dbname: string,
): Promise<AgentDiscovery | null> {
  const cached = agentDiscoveryCache.get(dbname);
  if (cached !== undefined) {
    return cached;
  }

  let discovery: AgentDiscovery | null = null;

  try {
    const { rows } = await pool.query(DISCOVERY_SQL);

    if (rows.length > 0) {
      const row = rows[0];
      const schemaName: string = row.schema_name;

      discovery = {
        thread: row.thread_table_name
          ? { schemaName, tableName: row.thread_table_name }
          : null,
        message: row.message_table_name
          ? { schemaName, tableName: row.message_table_name }
          : null,
        task: row.task_table_name
          ? { schemaName, tableName: row.task_table_name }
          : null,
      };
    }
  } catch {
    // Module table doesn't exist in this database — not provisioned
  }

  agentDiscoveryCache.set(dbname, discovery);
  return discovery;
}
