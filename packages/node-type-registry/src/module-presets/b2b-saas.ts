import { PresetB2bStorage } from './b2b-storage';
import type { ModulePreset } from './types';

/**
 * `b2b:saas` — `b2b:storage` plus `billing_provider_module`, the Stripe
 * provider bridge. The hosted-tenant shape for a B2B SaaS that bills its own
 * end customers.
 *
 * `b2b:storage` already carries the local billing catalog (`plans_module`,
 * `billing_module`, `rate_limit_meters_module`); this preset adds the provider
 * tables (customers, products, prices, subscriptions, operations ledger) and
 * the row-driven `billing:sync_*` triggers that mirror the catalog to Stripe.
 *
 * Deliberately no `function_module` / `webhook_module` / `route_module` /
 * `namespace_module`: a hosted tenant is served by the platform's shared
 * `functions/billing` and `functions/checkout` images, which resolve the
 * tenant from the invocation and read that tenant's Stripe key via
 * `ctx.secrets` per call. Its webhook signing secrets live in the infra lane
 * of the tenant's hook namespace, where the webhook gateway verifies
 * deliveries. The sync jobs the triggers enqueue are stamped `scope = 'app'`.
 * Every execution for the tenant reads the key and the billing config from the
 * nearest store along the frame walk: the tenant's own app-scope stores, which
 * `b2b:storage` installs, ahead of the platform's database-scope plane.
 *
 * Provisioning does not activate billing. The owner sets it up from the
 * dashboard's Monetization wizard: routes, key, hook namespace, webhook
 * endpoints, `billing:connect` (the half that needs the key), a catalog, and a
 * green `billing:doctor` verdict before `enable_billing` turns on.
 */
export const PresetB2bSaas: ModulePreset = {
  name: 'b2b:saas',
  display_name: 'B2B SaaS + Billing',
  summary:
    'b2b:storage plus the Stripe provider bridge (customers, products, prices, subscriptions, operations ledger).',
  description:
    'Everything in `b2b:storage`, plus `billing_provider_module`: the Stripe-side mirror of the ' +
    'local billing catalog (customers, products, prices, subscriptions, operations ledger) and ' +
    'the row-driven sync triggers on `plans`, `plan_pricing` and `plan_subscriptions` that ' +
    'enqueue `billing:sync_plan` / `billing:sync_price` / `billing:sync_subscription` at the ' +
    '`app` scope. The tenant bills its OWN end customers through its OWN Stripe account: the ' +
    "platform's shared `functions/billing` and `functions/checkout` images serve every tenant " +
    'and read `STRIPE_SECRET_KEY` via `ctx.secrets` per invocation (webhook signing secrets ' +
    "live in the infra lane of the tenant's hook namespace, where the webhook gateway verifies " +
    'deliveries), so the preset installs no function, webhook, route, or namespace module. ' +
    "Provisioning alone does not activate billing — the owner sets it up from the dashboard's " +
    'Monetization wizard: the billing and checkout routes on the tenant host, the Stripe key, ' +
    'a hook namespace with its webhook definitions and endpoints, `billing:connect` (the half ' +
    'that needs the key), a catalog, and a green `billing:doctor` verdict, which ' +
    '`database_settings.enable_billing = true` is gated on. Choose this when your B2B app ' +
    'sells plans to its customers and needs the Stripe bridge from day one.',
  good_for: [
    'B2B SaaS that bills its own end customers through its own Stripe account',
    'Apps that sell plans, prices and subscriptions from the local billing catalog',
    'Hosted tenants served by the shared `functions/billing` / `functions/checkout` images'
  ],
  not_for: [
    'Apps without customer billing — use `b2b:storage`, which already carries plans, billing and meters',
    'The kitchen-sink / dev shape — use `full`, which adds `function_module` and `namespace_module`',
    'Turnkey billing — activation still needs Stripe secrets, webhook rows, `checkout:session` route rows and `enable_billing`'
  ],
  modules: [...PresetB2bStorage.modules, 'billing_provider_module'],
  extends: ['b2b:storage']
};
