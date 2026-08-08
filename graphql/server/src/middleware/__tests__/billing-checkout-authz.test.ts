/**
 * Checkout authorization: who a caller may bill.
 *
 * Billing an entity other than yourself requires an ownership answer, and the
 * memberships module is the only thing that can give one. These tests pin the
 * three outcomes of that decision, including the one an end-to-end test cannot
 * reach.
 *
 * Why it cannot be reached: a tenant carrying `billing_provider_module` but no
 * `memberships_module` is not provisionable. Every billing RLS policy names the
 * `admin_limits` permission bit, and that bit is registered by
 * `initialize_permissions`, which only `memberships_module` calls — so
 * provisioning billing without memberships fails with
 * `permissions bitstring DNE`. The branch is a guard against a state the
 * supported path will not produce, which is precisely why it needs a test that
 * does not go through that path: nothing else will ever exercise it, and a
 * guard that has never run is a guard nobody knows the behavior of.
 *
 * The tenant-with-memberships cases live in constructive-tdd
 * (`stripe-multi-tenant/scripts/checkout-auth-regression.ts`) against a real
 * tenant; they are covered here too so the decision table can be read in one
 * place.
 */
jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

import express, { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import supertest from 'supertest';

import { createBillingRouter } from '../billing';

const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;

const DATABASE_ID = '00000000-0000-4000-8000-0000000000db';
const USER_ID = '00000000-0000-4000-8000-00000000user'.replace('user', '0001');
const ORG_ID = '00000000-0000-4000-8000-000000000002';

type QueryResponder = (sql: string, params?: any[]) => { rows: any[] } | null;

/**
 * A pool that answers only the queries a case needs. Anything unanswered comes
 * back empty, so a test can never pass because some unrelated query happened to
 * return something.
 */
const poolWith = (responder: QueryResponder): Pool =>
  ({
    query: jest.fn(async (sql: string, params?: any[]) => responder(sql, params) ?? { rows: [] })
  }) as unknown as Pool;

/** The billing provider lookup, configured enough to get past its own check. */
const providerConfigured = (sql: string) => {
  if (sql.includes('billing_provider_module')) {
    return {
      rows: [
        {
          id: 'bpm-1',
          private_schema: 'tenant-billing-private',
          prices_table: 'billing_prices',
          plans_public_schema: 'tenant-plans-public',
          plan_pricings_table: 'plan_pricings'
        }
      ]
    };
  }
  if (sql.includes('namespace_module')) {
    return {
      rows: [
        { ns_schema: 'infra_public', ns_table: 'namespaces', secrets_schema: 'store_private' }
      ]
    };
  }
  if (sql.includes('FROM infra_public.namespaces')) return { rows: [{ id: 'ns-1' }] };
  if (sql.includes('_secrets_get')) {
    return { rows: [{ api_key: 'sk_test_unit', webhook_secret: 'whsec_unit' }] };
  }
  return null;
};

const appWith = (pool: Pool) => {
  mockGetPgPool.mockReturnValue(pool);
  const app = express();
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).api = { databaseId: DATABASE_ID, dbname: 'tenant_db' };
    (req as any).token = { user_id: USER_ID };
    next();
  });
  app.use(createBillingRouter());
  return app;
};

const post = (app: express.Express, body: Record<string, unknown>) =>
  supertest(app)
    .post('/api/billing/checkout')
    .send({
      priceId: 'price-1',
      successUrl: 'https://example.com/ok',
      cancelUrl: 'https://example.com/no',
      ...body
    });

describe('checkout authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses an organization purchase when no memberships module can answer', async () => {
    const app = appWith(
      poolWith((sql) => {
        // The tenant has billing but no memberships: the ownership query
        // returns nothing at all.
        if (sql.includes('memberships_module')) return { rows: [] };
        return providerConfigured(sql);
      })
    );

    const res = await post(app, { entityId: ORG_ID });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot verify organization ownership');
  });

  it('does not fall through to the price lookup when ownership is unanswerable', async () => {
    const queries: string[] = [];
    const app = appWith(
      poolWith((sql) => {
        queries.push(sql);
        if (sql.includes('memberships_module')) return { rows: [] };
        return providerConfigured(sql);
      })
    );

    await post(app, { entityId: ORG_ID });

    // Reaching the price would mean the refusal came too late to matter.
    // Matched on the price lookup's own shape — the provider config query names
    // `billing_prices_table_name`, so the table name alone is not a marker.
    expect(queries.some((q) => q.includes('external_price_id'))).toBe(false);
  });

  it('refuses an organization purchase by a caller who is not the owner', async () => {
    const app = appWith(
      poolWith((sql) => {
        if (sql.includes('memberships_module')) {
          return { rows: [{ memberships_schema: 'tenant-memberships-public' }] };
        }
        if (sql.includes('org_memberships')) return { rows: [] };
        return providerConfigured(sql);
      })
    );

    const res = await post(app, { entityId: ORG_ID });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Only organization owner can subscribe');
  });

  it('asks about ownership using the caller and the nominated entity, not a claimed type', async () => {
    const ownerChecks: any[][] = [];
    const app = appWith(
      poolWith((sql, params) => {
        if (sql.includes('memberships_module')) {
          return { rows: [{ memberships_schema: 'tenant-memberships-public' }] };
        }
        if (sql.includes('org_memberships')) {
          ownerChecks.push(params ?? []);
          return { rows: [] };
        }
        return providerConfigured(sql);
      })
    );

    // entityType used to decide this. Sending a false one must change nothing.
    await post(app, { entityId: ORG_ID, entityType: 'user' });

    expect(ownerChecks).toHaveLength(1);
    expect(ownerChecks[0]).toEqual([USER_ID, ORG_ID]);
  });

  it('does not ask about ownership when the caller is billing themselves', async () => {
    const queries: string[] = [];
    const app = appWith(
      poolWith((sql) => {
        queries.push(sql);
        return providerConfigured(sql);
      })
    );

    // No entityId at all, and the explicit form of the same thing.
    await post(app, {});
    await post(app, { entityId: USER_ID });

    expect(queries.some((q) => q.includes('memberships_module'))).toBe(false);
  });
});
