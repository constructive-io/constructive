import type { PgTestClient } from 'pgsql-test';
import { resolveSchemaName } from './resolve';
import { provisionDatabase } from '../core/provision';
import { uniqueName } from '../core/identifiers';
import { toJsonbModules, ModuleEntry } from '../core/presets';
import { seedDatabaseUser, SeedDatabaseUserOptions } from '../core/test-users';
import { setDatabaseAppMembershipDefaults } from '../membership/app-membership';

/**
 * Resolved agent_module metadata for a database.
 */
export interface AgentModuleInfo {
  schema: string;
  scope: string;
  entity_table_id: string | null;

  // Core tables (always present)
  thread_table: string;
  message_table: string;
  task_table: string;

  // Optional tables (depend on feature flags)
  plan_table: string | null;
  resource_table: string | null;
  agent_table: string | null;
  persona_table: string | null;

  // Feature flags
  has_plans: boolean;
  has_resources: boolean;
  has_agents: boolean;
  shared: boolean;

  // Raw IDs for structural assertions
  thread_table_id: string;
  message_table_id: string;
  task_table_id: string;
  schema_id: string;
}

/**
 * Resolve agent_module schema + table names for a database.
 */
export async function resolveAgentModule(
  client: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<AgentModuleInfo> {
  const mod = await client.one<{
    schema_id: string;
    scope: string;
    entity_table_id: string | null;
    thread_table_name: string;
    message_table_name: string;
    task_table_name: string;
    plan_table_name: string | null;
    resource_table_name: string | null;
    agent_table_name: string | null;
    persona_table_name: string | null;
    has_plans: boolean;
    has_resources: boolean;
    has_agents: boolean;
    shared: boolean;
    thread_table_id: string;
    message_table_id: string;
    task_table_id: string;
  }>(
    `SELECT schema_id, scope, entity_table_id,
            thread_table_name, message_table_name, task_table_name,
            plan_table_name, resource_table_name,
            agent_table_name, persona_table_name,
            has_plans, has_resources, has_agents, shared,
            thread_table_id, message_table_id, task_table_id
     FROM metaschema_modules_public.agent_module
     WHERE database_id = $1 AND scope = $2`,
    [database_id, scope]
  );

  const schema = await resolveSchemaName(client, mod.schema_id);

  return {
    schema,
    scope: mod.scope,
    entity_table_id: mod.entity_table_id,
    thread_table: mod.thread_table_name,
    message_table: mod.message_table_name,
    task_table: mod.task_table_name,
    plan_table: mod.plan_table_name,
    resource_table: mod.resource_table_name,
    agent_table: mod.agent_table_name,
    persona_table: mod.persona_table_name,
    has_plans: mod.has_plans,
    has_resources: mod.has_resources,
    has_agents: mod.has_agents,
    shared: mod.shared,
    thread_table_id: mod.thread_table_id,
    message_table_id: mod.message_table_id,
    task_table_id: mod.task_table_id,
    schema_id: mod.schema_id,
  };
}

/**
 * Qualified table reference for agent module tables.
 */
export function qt(agent: AgentModuleInfo, table_name: string): string {
  return `"${agent.schema}"."${table_name}"`;
}

// ─── Agent Provisioning ───────────────────────────────────────────────────────

/** Base modules required for app-level agent provisioning. */
const AGENT_BASE_MODULES: readonly ModuleEntry[] = [
  'users_module',
  'membership_types_module',
  ['permissions_module', { scope: 'app' }],
  ['limits_module', { scope: 'app' }],
  ['memberships_module', { scope: 'app' }],
  ['events_module', { scope: 'app' }],
];

export interface ProvisionAgentDatabaseOptions {
  pg: PgTestClient;
  owner_id: string;
  agent_options?: Record<string, unknown>;
  name_prefix?: string;
  seed_users?: SeedDatabaseUserOptions[];
}

/**
 * Provision a database with app-level modules + agent_module in one call.
 * Handles module assembly, provisioning, membership defaults, and user seeding.
 */
export async function provisionAgentDatabase(opts: ProvisionAgentDatabaseOptions): Promise<{
  database_id: string;
  agent: AgentModuleInfo;
}> {
  const { pg, owner_id, agent_options = {}, name_prefix = 'agent_db', seed_users = [] } = opts;

  const modules = toJsonbModules([
    ...AGENT_BASE_MODULES,
    ['agent_module', agent_options],
  ]);

  const database_id = await provisionDatabase(pg, {
    name: uniqueName(name_prefix),
    owner_id,
    modules,
  });

  await setDatabaseAppMembershipDefaults(pg, database_id, { is_verified: true, is_approved: true });

  for (const user of seed_users) {
    await seedDatabaseUser(pg, database_id, user);
  }

  const agent = await resolveAgentModule(pg, database_id);

  return { database_id, agent };
}

// ─── Metaschema introspection helpers ─────────────────────────────────────────

/**
 * Get field names for a table from metaschema.
 */
export async function getFieldNames(
  pg: PgTestClient,
  table_id: string
): Promise<string[]> {
  const fields = await pg.any<{ name: string }>(
    `SELECT f.name FROM metaschema_public.field f
     WHERE f.table_id = $1 ORDER BY f.name`,
    [table_id]
  );
  return fields.map((f) => f.name);
}

/**
 * Get policy types applied to a table from metaschema.
 */
export async function getPolicyTypes(
  pg: PgTestClient,
  table_id: string
): Promise<string[]> {
  const policies = await pg.any<{ policy_type: string }>(
    `SELECT p.policy_type FROM metaschema_public.policy p
     WHERE p.table_id = $1`,
    [table_id]
  );
  return policies.map((p) => p.policy_type);
}
