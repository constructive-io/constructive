/**
 * Billing Module Loader
 *
 * Resolves per-database billing config through the database's login-only
 * reader `function_resolution.billing_module_registrations`.
 * Returns schema names and function names needed for quota checks and usage recording.
 */

import type { BillingConfig } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const BILLING_MODULE_SQL = `
  SELECT public_schema, private_schema, record_usage_function
  FROM function_resolution.billing_module_registrations($1)
  LIMIT 1
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
    const row = result.rows[0];
    if (!row?.record_usage_function) return undefined;

    return {
      publicSchema: row.public_schema,
      privateSchema: row.private_schema,
      recordUsageFunction: row.record_usage_function,
      checkBillingQuotaFunction: 'check_billing_quota',
    };
  },
});
