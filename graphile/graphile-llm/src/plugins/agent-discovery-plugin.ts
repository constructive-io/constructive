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

interface CacheEntry {
  discovery: AgentDiscovery | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;

const agentDiscoveryCache = new Map<string, CacheEntry>();

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
 * Results are cached per-database for CACHE_TTL_MS.
 */
export async function getAgentDiscovery(
  pool: Pool,
  dbname: string,
): Promise<AgentDiscovery | null> {
  const now = Date.now();
  const cached = agentDiscoveryCache.get(dbname);
  if (cached && cached.expiresAt > now) {
    return cached.discovery;
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

  agentDiscoveryCache.set(dbname, { discovery, expiresAt: now + CACHE_TTL_MS });
  return discovery;
}
