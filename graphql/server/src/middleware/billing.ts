import { Logger } from '@pgpmjs/logger';
import express, { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import Stripe from 'stripe';

const log = new Logger('billing');

// The webhook receiver in constructive-db reads objects this endpoint creates,
// so both sides pin the same API version. Pinning it here also keeps a
// dependency bump from silently changing the shape of what Stripe returns.
const STRIPE_API_VERSION = '2025-02-24.acacia';

interface BillingProviderConfig {
  apiKey: string | null;
  webhookSecret: string | null;
  privateSchema: string;
  pricesTable: string;
  plansPublicSchema: string | null;
  planPricingsTable: string;
}

async function getBillingProviderConfig(
  pool: Pool,
  databaseId: string
): Promise<BillingProviderConfig | null> {
  try {
    // Get billing_provider_module metadata and plans_module public schema
    const result = await pool.query(`
      SELECT
        bpm.id,
        metaschema.schema_name(bpm.private_schema_id) as private_schema,
        bpm.billing_prices_table_name as prices_table,
        metaschema.schema_name(pm.schema_id) as plans_public_schema,
        COALESCE(ppt.name, 'plan_pricings') as plan_pricings_table
      FROM metaschema_modules_public.billing_provider_module bpm
      LEFT JOIN metaschema_modules_public.plans_module pm ON pm.database_id = bpm.database_id
      LEFT JOIN metaschema_public."table" ppt ON ppt.id = pm.plan_pricing_table_id
      WHERE bpm.provider = 'stripe' AND bpm.database_id = $1
      LIMIT 1
    `, [databaseId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get namespace_module and infra_secrets_module schemas dynamically
    // Tenant databases share platform's infra tables, so fallback to platform database
    const moduleResult = await pool.query(`
      WITH platform_db AS (
        SELECT id FROM metaschema_public.database WHERE name = 'constructive' LIMIT 1
      )
      SELECT
        metaschema.schema_name(nm.schema_id) as ns_schema,
        nm.namespaces_table_name as ns_table,
        metaschema.schema_name(ism.private_schema_id) as secrets_schema
      FROM metaschema_modules_public.namespace_module nm
      LEFT JOIN metaschema_modules_public.infra_secrets_module ism
        ON ism.database_id = nm.database_id AND ism.scope = 'platform'
      WHERE nm.database_id = (SELECT id FROM platform_db)
        AND nm.namespaces_table_name = 'namespaces'
      LIMIT 1
    `);

    let apiKey: string | null = null;
    let webhookSecret: string | null = null;

    if (moduleResult.rows.length > 0) {
      const { ns_schema, ns_table, secrets_schema } = moduleResult.rows[0];

      // Get "billing" namespace for this database
      const nsResult = await pool.query(`
        SELECT id FROM ${ns_schema}.${ns_table}
        WHERE database_id = $1 AND name = 'billing'
        LIMIT 1
      `, [databaseId]);

      if (nsResult.rows.length > 0) {
        const namespaceId = nsResult.rows[0].id;

        // Get Stripe secrets using _secrets_get function
        const apiKeyResult = await pool.query(`
          SELECT ${secrets_schema}._secrets_get($1, 'stripe_api_key', $2) as api_key
        `, [databaseId, namespaceId]);
        apiKey = apiKeyResult.rows[0]?.api_key || null;

        const webhookSecretResult = await pool.query(`
          SELECT ${secrets_schema}._secrets_get($1, 'stripe_webhook_secret', $2) as webhook_secret
        `, [databaseId, namespaceId]);
        webhookSecret = webhookSecretResult.rows[0]?.webhook_secret || null;
      }
    }

    return {
      apiKey,
      webhookSecret,
      privateSchema: row.private_schema,
      pricesTable: row.prices_table,
      plansPublicSchema: row.plans_public_schema,
      planPricingsTable: row.plan_pricings_table,
    };
  } catch (err) {
    log.error('Failed to get billing provider config', { error: err, databaseId });
    return null;
  }
}

interface PriceInfo {
  stripePriceId: string;
  planId: string | null;
  billingInterval: string | null;
}

async function getStripePriceId(
  pool: Pool,
  priceId: string,
  config: BillingProviderConfig
): Promise<PriceInfo | null> {
  try {
    log.info('Price lookup config', {
      privateSchema: config.privateSchema,
      pricesTable: config.pricesTable,
      plansPublicSchema: config.plansPublicSchema,
      planPricingsTable: config.planPricingsTable,
      priceId,
    });

    // Get stripe price ID, plan_id, and billing_interval from plan_pricings
    const result = await pool.query(`
      SELECT bp.external_price_id, pp.plan_id, pp.billing_interval
      FROM "${config.privateSchema}"."${config.pricesTable}" bp
      LEFT JOIN "${config.plansPublicSchema}"."${config.planPricingsTable}" pp ON pp.id = bp.resource_id
      WHERE bp.provider = 'stripe' AND bp.resource_id = $1
      LIMIT 1
    `, [priceId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      stripePriceId: result.rows[0].external_price_id,
      planId: result.rows[0].plan_id,
      billingInterval: result.rows[0].billing_interval,
    };
  } catch (err) {
    log.error('Failed to get Stripe price ID', { error: err, priceId });
    return null;
  }
}

interface BillingRouterOptions {
  pg?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
}

export function createBillingRouter(opts: BillingRouterOptions = {}): Router {
  const router = Router();

  router.use('/api/billing', express.json());

  // POST /api/billing/checkout — creates a Stripe Checkout Session for either
  // the caller or an organization the caller owns.
  router.post('/api/billing/checkout', async (req: Request, res: Response) => {
    try {
      const databaseId = req.api?.databaseId;
      const dbname = req.api?.dbname;
      const userId = req.token?.user_id;

      if (!databaseId || !dbname) {
        log.warn('Missing database context');
        return res.status(400).json({ error: 'Missing database context' });
      }

      if (!userId) {
        log.warn('Unauthorized: missing user');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        priceId,
        successUrl,
        cancelUrl,
        entityId: reqEntityId
      } = req.body;

      if (!priceId || !successUrl || !cancelUrl) {
        return res.status(400).json({ error: 'Missing required fields: priceId, successUrl, cancelUrl' });
      }

      const pool = getPgPool({ ...opts.pg, database: dbname });

      const config = await getBillingProviderConfig(pool, databaseId);
      if (!config || !config.apiKey) {
        log.error('Stripe not configured for tenant', { databaseId });
        return res.status(500).json({ error: 'Billing not configured' });
      }

      // The entity being billed is whoever the caller nominated, defaulting to
      // the caller. Anything other than the caller has to be an organization
      // they own, so authorization is decided by the id itself rather than by
      // the caller's own claim about what kind of entity it is.
      const entityId = reqEntityId || userId;
      const isOrgPurchase = entityId !== userId;

      if (isOrgPurchase) {
        const schemaResult = await pool.query(`
          SELECT metaschema.schema_name(mm.schema_id) as memberships_schema
          FROM metaschema_modules_public.memberships_module mm
          WHERE mm.database_id = $1
          LIMIT 1
        `, [databaseId]);

        const membershipsSchema = schemaResult.rows[0]?.memberships_schema;

        // Without the memberships module there is nowhere to check ownership.
        // Refuse rather than fall through: skipping the check would let any
        // caller bill any entity id they can guess.
        if (!membershipsSchema) {
          log.error('Cannot verify org ownership: memberships module not provisioned', {
            databaseId,
            orgId: entityId,
          });
          return res.status(403).json({ error: 'Cannot verify organization ownership' });
        }

        const ownerCheck = await pool.query(`
          SELECT 1 FROM "${membershipsSchema}".org_memberships
          WHERE actor_id = $1 AND entity_id = $2 AND is_owner = true
          LIMIT 1
        `, [userId, entityId]);

        if (ownerCheck.rows.length === 0) {
          log.warn('User is not org owner', { userId, orgId: entityId });
          return res.status(403).json({ error: 'Only organization owner can subscribe' });
        }
      }

      const priceInfo = await getStripePriceId(pool, priceId, config);
      if (!priceInfo) {
        log.warn('Price not found', { priceId });
        return res.status(404).json({ error: 'Price not found' });
      }

      const stripe = new Stripe(config.apiKey, { apiVersion: STRIPE_API_VERSION });

      const isOneTime = priceInfo.billingInterval === 'one_time';

      // entity_type is derived from the ownership decision above, not taken
      // from the request, so it always describes the entity that was actually
      // authorized.
      const metadata = {
        entity_id: entityId,
        entity_type: isOrgPurchase ? 'org' : 'user',
        plan_id: priceInfo.planId,
        database_id: databaseId,
        user_id: userId,
      };

      const session = isOneTime
        ? await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [{ price: priceInfo.stripePriceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          payment_intent_data: {
            metadata: { ...metadata, type: 'credit_purchase' },
          },
          metadata: { ...metadata, type: 'credit_purchase' },
        })
        : await stripe.checkout.sessions.create({
          mode: 'subscription',
          line_items: [{ price: priceInfo.stripePriceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata,
          subscription_data: { metadata },
        });

      log.info('Created checkout session', {
        sessionId: session.id,
        entityId,
        databaseId,
        priceId,
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      log.error('Checkout error', { error: err.message });
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  return router;
}
