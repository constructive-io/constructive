/**
 * Billing Module Loader
 *
 * Resolves per-database billing config from metaschema_modules_public.billing_module.
 * Returns schema names and function names needed for quota checks and usage recording.
 */

import type { BillingConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const BILLING_MODULE_SQL = `
  SELECT
    s.schema_name AS public_schema,
    ps.schema_name AS private_schema,
    bm.record_usage_function
  FROM metaschema_modules_public.billing_module bm
  JOIN metaschema_public.schema s
    ON bm.schema_id = s.id
   AND s.database_id = bm.database_id
  JOIN metaschema_public.schema ps
    ON bm.private_schema_id = ps.id
   AND ps.database_id = bm.database_id
  WHERE bm.database_id = $1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface BillingModuleRow {
  public_schema: string;
  private_schema: string;
  record_usage_function: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const billingLoader: ModuleLoader<BillingConfig> = createModuleLoader<BillingConfig>({
  name: 'billing',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;

    const result = await tenantPool.query<BillingModuleRow>(
      BILLING_MODULE_SQL,
      [databaseId],
    );
    if (result.rows.length > 1) {
      throw new Error('Ambiguous billing module configuration');
    }
    const row = result.rows[0];
    if (!row) return undefined;
    if (!row.public_schema || !row.private_schema || !row.record_usage_function) {
      throw new Error('Incomplete or cross-database billing module configuration');
    }

    return {
      publicSchema: row.public_schema,
      privateSchema: row.private_schema,
      recordUsageFunction: row.record_usage_function,
      checkBillingQuotaFunction: 'check_billing_quota',
    };
  },
});
