import type { PgTestClient } from 'pgsql-test';
import { resolveSchemaName } from './resolve';

export interface BillingModuleInfo {
  public_schema: string;
  private_schema: string;
  meters_table_name: string;
  meter_credits_table_name: string;
  balances_table_name: string;
}

/**
 * Resolve billing_module schema + table names for a database.
 */
export async function resolveBillingModule(
  client: PgTestClient,
  database_id: string
): Promise<BillingModuleInfo> {
  const mod = await client.one<{
    schema_id: string;
    private_schema_id: string;
    meters_table_name: string;
    meter_credits_table_id: string;
    balances_table_id: string;
  }>(
    `SELECT schema_id, private_schema_id,
            meters_table_name, meter_credits_table_id,
            balances_table_id
     FROM metaschema_modules_public.billing_module
     WHERE database_id = $1`,
    [database_id]
  );

  const [public_schema, private_schema, mc_info, bal_info] = await Promise.all([
    resolveSchemaName(client, mod.schema_id),
    resolveSchemaName(client, mod.private_schema_id),
    client.one<{ name: string }>(
      `SELECT name FROM metaschema_public.table WHERE id = $1`,
      [mod.meter_credits_table_id]
    ),
    client.one<{ name: string }>(
      `SELECT name FROM metaschema_public.table WHERE id = $1`,
      [mod.balances_table_id]
    ),
  ]);

  return {
    public_schema,
    private_schema,
    meters_table_name: mod.meters_table_name,
    meter_credits_table_name: mc_info.name,
    balances_table_name: bal_info.name,
  };
}

/**
 * Create a billing meter. Returns the meter ID.
 */
export async function createMeter(
  client: PgTestClient,
  billing: BillingModuleInfo,
  opts: {
    slug: string;
    display_name: string;
    meter_type: string;
    period_interval?: string;
  }
): Promise<string> {
  const cols = opts.period_interval
    ? '(slug, display_name, meter_type, period_interval)'
    : '(slug, display_name, meter_type)';
  const vals = opts.period_interval ? '($1, $2, $3, $4)' : '($1, $2, $3)';
  const params = opts.period_interval
    ? [opts.slug, opts.display_name, opts.meter_type, opts.period_interval]
    : [opts.slug, opts.display_name, opts.meter_type];

  const row = await client.one<{ id: string }>(
    `INSERT INTO "${billing.public_schema}"."${billing.meters_table_name}" ${cols}
     VALUES ${vals}
     RETURNING id`,
    params
  );
  return row.id;
}

/**
 * Get meter_credits matching a reason pattern for an entity.
 */
export async function getMeterCredits(
  client: PgTestClient,
  billing: BillingModuleInfo,
  entity_id: string,
  reason_like: string
): Promise<Record<string, unknown>[]> {
  return client.any(
    `SELECT * FROM "${billing.public_schema}"."${billing.meter_credits_table_name}"
     WHERE entity_id = $1 AND reason LIKE $2`,
    [entity_id, reason_like]
  );
}

/**
 * Get meter_credits by entity + meter_id.
 */
export async function getMeterCreditsByMeter(
  client: PgTestClient,
  billing: BillingModuleInfo,
  entity_id: string,
  meter_id: string
): Promise<Record<string, unknown>[]> {
  return client.any(
    `SELECT * FROM "${billing.public_schema}"."${billing.meter_credits_table_name}"
     WHERE entity_id = $1 AND meter_id = $2`,
    [entity_id, meter_id]
  );
}
