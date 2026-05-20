/**
 * LlmAgentDiscoveryPlugin
 *
 * Discovers agent tables at PostGraphile schema build time by scanning
 * the pgRegistry for tables tagged with @agentThread, @agentMessage,
 * and @agentTask smart tags.
 *
 * Results are:
 *   1. Placed on the build context (for other plugins)
 *   2. Stored in a module-level cache keyed by cacheKey (for the REST API
 *      middleware to look up discovered table names without access to the
 *      PostGraphile build)
 *
 * Smart tags are set via construct_blueprint() when the agent blueprint
 * includes `"smart_tags": { "agentThread": true }` on a table entry.
 */

import type { GraphileConfig } from 'graphile-config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentTableInfo {
  /** The PostgreSQL schema name (e.g. 'constructive_agent_public') */
  schemaName: string;
  /** The table name (e.g. 'agent_thread') */
  tableName: string;
  /** The codec name from pgRegistry */
  codecName: string;
}

export interface AgentDiscovery {
  thread: AgentTableInfo | null;
  message: AgentTableInfo | null;
  task: AgentTableInfo | null;
}

// ─── Module-level cache ─────────────────────────────────────────────────────

/** Cache of agent discovery results, keyed by graphile cache key (dbname-based) */
const agentDiscoveryCache = new Map<string, AgentDiscovery>();

/**
 * Look up cached agent discovery for a given database name.
 * Called by the REST API middleware at request time.
 *
 * The key should match the graphile cache key format used by
 * the server (typically the dbname or a composite key).
 * Falls back to scanning all entries if an exact match isn't found
 * (single-database deployments).
 */
export function getAgentDiscovery(dbname: string): AgentDiscovery | null {
  // Exact match
  const exact = agentDiscoveryCache.get(dbname);
  if (exact) return exact;

  // If there's only one entry, return it (single-database deployment)
  if (agentDiscoveryCache.size === 1) {
    return agentDiscoveryCache.values().next().value ?? null;
  }

  // Scan for partial key match (key might contain dbname as a substring)
  for (const [key, value] of agentDiscoveryCache) {
    if (key.includes(dbname)) return value;
  }

  return null;
}

/** Clear all cached discovery results (for testing) */
export function clearAgentDiscoveryCache(): void {
  agentDiscoveryCache.clear();
}

// ─── TypeScript Augmentation ────────────────────────────────────────────────

declare global {
  namespace GraphileBuild {
    interface Build {
      /** Discovered agent tables from smart tags, or null if agent blueprint not provisioned */
      agentDiscovery: AgentDiscovery | null;
    }
  }
  namespace GraphileConfig {
    interface Plugins {
      LlmAgentDiscoveryPlugin: true;
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findTaggedTable(
  build: any,
  tagName: string,
): AgentTableInfo | null {
  const pgRegistry = build.pgRegistry;
  if (!pgRegistry) return null;

  for (const source of Object.values(pgRegistry.pgResources || {})) {
    const codec = (source as any)?.codec;
    if (!codec?.attributes) continue;

    const tags = codec.extensions?.tags;
    if (!tags?.[tagName]) continue;

    const schemaName = codec.extensions?.pg?.schemaName
      ?? (source as any)?.extensions?.pg?.schemaName
      ?? null;
    const tableName = codec.extensions?.pg?.name
      ?? codec.name
      ?? null;

    if (!schemaName || !tableName) continue;

    return {
      schemaName,
      tableName,
      codecName: codec.name || tableName,
    };
  }

  return null;
}

// ─── Plugin ─────────────────────────────────────────────────────────────────

export const LlmAgentDiscoveryPlugin: GraphileConfig.Plugin = {
  name: 'LlmAgentDiscoveryPlugin',
  version: '0.1.0',
  description:
    'Discovers agent tables by @agentThread/@agentMessage/@agentTask smart tags ' +
    'and makes schema/table names available on the build context and module cache',

  schema: {
    hooks: {
      build(build) {
        const thread = findTaggedTable(build, 'agentThread');
        const message = findTaggedTable(build, 'agentMessage');
        const task = findTaggedTable(build, 'agentTask');

        const discovery: AgentDiscovery | null =
          thread || message || task
            ? { thread, message, task }
            : null;

        if (discovery) {
          const parts: string[] = [];
          if (thread) parts.push(`thread=${thread.schemaName}.${thread.tableName}`);
          if (message) parts.push(`message=${message.schemaName}.${message.tableName}`);
          if (task) parts.push(`task=${task.schemaName}.${task.tableName}`);
          console.log(`[graphile-llm] Agent tables discovered: ${parts.join(', ')}`);

          // Store in module-level cache for the REST middleware.
          // Use the first schema name as cache key (all agent tables share one schema).
          const cacheKey = thread?.schemaName ?? message?.schemaName ?? 'agent';
          agentDiscoveryCache.set(cacheKey, discovery);
        } else {
          console.log(
            '[graphile-llm] No agent tables found (no @agentThread/@agentMessage/@agentTask tags). ' +
            'Agent REST API will be disabled.',
          );
        }

        return build.extend(
          build,
          { agentDiscovery: discovery },
          'LlmAgentDiscoveryPlugin adding agentDiscovery to build',
        );
      },
    },
  },
};
