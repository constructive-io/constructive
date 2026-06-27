import type { PgTestClient } from 'pgsql-test';
import { resolveSchemaName } from './resolve';

export interface EventsModuleInfo {
  public_schema: string;
  private_schema: string;
  events_table_name: string;
  event_aggregates_table_name: string;
  event_types_table_name: string;
  levels_table_name: string;
  level_requirements_table_name: string;
  level_grants_table_name: string;
  achievement_rewards_table_name: string;
  record_event_func: string;
}

/**
 * Resolve events_module schema + table names for a database.
 */
export async function resolveEventsModule(
  client: PgTestClient,
  database_id: string,
  scope: string = 'app'
): Promise<EventsModuleInfo> {
  const mod = await client.one<{
    schema_id: string;
    private_schema_id: string;
    events_table_name: string;
    event_aggregates_table_name: string;
    event_types_table_name: string;
    levels_table_name: string;
    level_requirements_table_name: string;
    level_grants_table_name: string;
    achievement_rewards_table_name: string;
    record_event: string;
  }>(
    `SELECT schema_id, private_schema_id,
            events_table_name, event_aggregates_table_name,
            event_types_table_name, levels_table_name,
            level_requirements_table_name, level_grants_table_name,
            achievement_rewards_table_name, record_event
     FROM metaschema_modules_public.events_module
     WHERE database_id = $1 AND scope = $2`,
    [database_id, scope]
  );

  const [public_schema, private_schema] = await Promise.all([
    resolveSchemaName(client, mod.schema_id),
    resolveSchemaName(client, mod.private_schema_id),
  ]);

  return {
    public_schema,
    private_schema,
    events_table_name: mod.events_table_name,
    event_aggregates_table_name: mod.event_aggregates_table_name,
    event_types_table_name: mod.event_types_table_name,
    levels_table_name: mod.levels_table_name,
    level_requirements_table_name: mod.level_requirements_table_name,
    level_grants_table_name: mod.level_grants_table_name,
    achievement_rewards_table_name: mod.achievement_rewards_table_name,
    record_event_func: mod.record_event,
  };
}

// ─── Event Domain Helpers ─────────────────────────────────────────────────────

/**
 * Register an event type. Idempotent (ON CONFLICT DO NOTHING).
 */
export async function registerEventType(
  client: PgTestClient,
  events: EventsModuleInfo,
  name: string,
  opts?: { period_interval?: string }
): Promise<void> {
  const cols = opts?.period_interval ? '(name, period_interval)' : '(name)';
  const vals = opts?.period_interval ? '($1, $2)' : '($1)';
  const params = opts?.period_interval ? [name, opts.period_interval] : [name];

  await client.query(
    `INSERT INTO "${events.public_schema}"."${events.event_types_table_name}" ${cols}
     VALUES ${vals}
     ON CONFLICT (name) DO NOTHING`,
    params
  );
}

/**
 * Call record_event for a given event name and actor.
 */
export async function recordEvent(
  client: PgTestClient,
  events: EventsModuleInfo,
  name: string,
  actor_id: string
): Promise<void> {
  await client.query(
    `SELECT "${events.private_schema}"."${events.record_event_func}"($1, $2)`,
    [name, actor_id]
  );
}

/**
 * Create a level (achievement tier).
 */
export async function createLevel(
  client: PgTestClient,
  events: EventsModuleInfo,
  name: string
): Promise<void> {
  await client.query(
    `INSERT INTO "${events.public_schema}"."${events.levels_table_name}" (name)
     VALUES ($1)`,
    [name]
  );
}

/**
 * Create a level requirement.
 */
export async function createRequirement(
  client: PgTestClient,
  events: EventsModuleInfo,
  opts: { name: string; level: string; required_count: number }
): Promise<void> {
  await client.query(
    `INSERT INTO "${events.public_schema}"."${events.level_requirements_table_name}" (name, level, required_count)
     VALUES ($1, $2, $3)`,
    [opts.name, opts.level, opts.required_count]
  );
}

/**
 * Create an achievement reward.
 */
export async function createReward(
  client: PgTestClient,
  events: EventsModuleInfo,
  opts: {
    level_name: string;
    reward_type: string;
    target_name: string;
    amount: number;
    credit_type: string;
    expires_interval?: string;
  }
): Promise<void> {
  const cols = opts.expires_interval
    ? '(level_name, reward_type, target_name, amount, credit_type, expires_interval)'
    : '(level_name, reward_type, target_name, amount, credit_type)';
  const vals = opts.expires_interval ? '($1, $2, $3, $4, $5, $6)' : '($1, $2, $3, $4, $5)';
  const params = opts.expires_interval
    ? [opts.level_name, opts.reward_type, opts.target_name, opts.amount, opts.credit_type, opts.expires_interval]
    : [opts.level_name, opts.reward_type, opts.target_name, opts.amount, opts.credit_type];

  await client.query(
    `INSERT INTO "${events.public_schema}"."${events.achievement_rewards_table_name}" ${cols}
     VALUES ${vals}`,
    params
  );
}

/**
 * Composite: register event type + create level + create requirement + optional reward.
 * Covers the most common 4-step achievement setup pattern.
 */
export async function setupAchievement(
  client: PgTestClient,
  events: EventsModuleInfo,
  opts: {
    event_name: string;
    level_name: string;
    required_count: number;
    period_interval?: string;
    reward?: {
      reward_type: string;
      target_name: string;
      amount: number;
      credit_type: string;
      expires_interval?: string;
    };
  }
): Promise<void> {
  await registerEventType(client, events, opts.event_name, {
    period_interval: opts.period_interval,
  });
  await createLevel(client, events, opts.level_name);
  await createRequirement(client, events, {
    name: opts.event_name,
    level: opts.level_name,
    required_count: opts.required_count,
  });
  if (opts.reward) {
    await createReward(client, events, {
      level_name: opts.level_name,
      ...opts.reward,
    });
  }
}

// ─── Event Verification Helpers ───────────────────────────────────────────────

/**
 * Get the aggregate count for an event name + actor.
 */
export async function getAggregateCount(
  client: PgTestClient,
  events: EventsModuleInfo,
  name: string,
  actor_id: string
): Promise<number> {
  const row = await client.oneOrNone<{ count: string }>(
    `SELECT count FROM "${events.public_schema}"."${events.event_aggregates_table_name}"
     WHERE name = $1 AND actor_id = $2`,
    [name, actor_id]
  );
  return row ? Number(row.count) : 0;
}

/**
 * Get a level_grant row (or null) for a level + actor.
 */
export async function getLevelGrant(
  client: PgTestClient,
  events: EventsModuleInfo,
  level_name: string,
  actor_id: string
): Promise<Record<string, unknown> | null> {
  return client.oneOrNone(
    `SELECT * FROM "${events.public_schema}"."${events.level_grants_table_name}"
     WHERE level_name = $1 AND actor_id = $2`,
    [level_name, actor_id]
  );
}

/**
 * Get all level_grant rows for a level + actor.
 */
export async function getLevelGrants(
  client: PgTestClient,
  events: EventsModuleInfo,
  level_name: string,
  actor_id: string
): Promise<Record<string, unknown>[]> {
  return client.any(
    `SELECT * FROM "${events.public_schema}"."${events.level_grants_table_name}"
     WHERE level_name = $1 AND actor_id = $2
     ORDER BY period_start`,
    [level_name, actor_id]
  );
}
