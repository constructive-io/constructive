import type { LimitBaselinePreset, TrustLadderPreset } from './types';

/**
 * Five rungs that buy capacity, for apps where consumption is the thing being
 * rationed. Opt-in rather than the default: metering API traffic is a decision
 * about a product, and most apps only want to know whether an account belongs
 * to someone (see `humanity`).
 *
 * The shape is the deliberate part; the magnitudes are still estimates:
 *
 * - `reachable` / `accountable` are alternatives-based, so a rung is satisfied
 *   by any one of its options and pays its reward once.
 * - `established` / `trusted` want *longevity plus activity*, both — age alone
 *   is free to wait out and activity alone is cheap to manufacture. Age comes
 *   from the `account_age_days` metric, derived from the actor row rather than
 *   materialised as daily events.
 * - `vouched` spends someone else's reputation, so its threshold is low (2) but
 *   its reward is the one that lets an account create more accounts.
 *
 * Amounts step by roughly an order of magnitude per rung: cheap enough to be
 * useful early, expensive enough that the top rung is worth climbing to rather
 * than automating around.
 */
export const metered: TrustLadderPreset = {
  kind: 'trust_ladder',
  slug: 'metered',
  label: 'Metered progressive trust',
  description:
    'Five rungs — reachable, accountable, established, trusted, vouched — each projecting into a level capability and buying limit capacity. For apps that ration consumption; amounts are starting points meant to be tuned.',
  rungs: [
    { level: 'reachable', event: 'email.verified', group: 'contactable', capability: 'level.reachable', limit: 'api_requests_per_day', limit_amount: 4500 },
    { level: 'reachable', event: 'phone.verified', group: 'contactable', capability: 'level.reachable', limit: 'api_requests_per_day', limit_amount: 4500 },
    { level: 'reachable', event: 'captcha.passed', group: 'contactable', capability: 'level.reachable', limit: 'api_requests_per_day', limit_amount: 4500 },

    { level: 'accountable', event: 'payment_method.added', group: 'accountable', capability: 'level.accountable', limit: 'outbound_messages_per_day', limit_amount: 95 },
    { level: 'accountable', event: 'identity.verified', group: 'accountable', capability: 'level.accountable', limit: 'outbound_messages_per_day', limit_amount: 95 },

    { level: 'established', metric: 'account_age_days', required_count: 30, capability: 'level.established', limit: 'api_requests_per_day', limit_amount: 45000 },
    { level: 'established', event: 'action.completed', required_count: 25, capability: 'level.established', limit: 'api_requests_per_day', limit_amount: 45000 },

    { level: 'trusted', metric: 'account_age_days', required_count: 90, capability: 'level.trusted', limit: 'outbound_messages_per_day', limit_amount: 900 },
    { level: 'trusted', event: 'action.completed', required_count: 250, capability: 'level.trusted', limit: 'outbound_messages_per_day', limit_amount: 900 },

    { level: 'vouched', event: 'vouch.received', required_count: 2, capability: 'level.vouched', limit: 'invites_sent', limit_amount: 23 },

    { level: 'profile_complete', event: 'terms.accepted' },
    { level: 'profile_complete', event: 'privacy.accepted' },
    { level: 'profile_complete', event: 'username.chosen' },
    { level: 'profile_complete', event: 'avatar.uploaded' },
  ],
};

/**
 * The baseline `metered` pays into: small enough that an unproven principal
 * cannot do damage at volume, large enough to finish signing up and look
 * around. Each rung's reward is a credit deposit on top of these.
 */
export const meteredBaseline: LimitBaselinePreset = {
  kind: 'limit_defaults',
  slug: 'metered',
  label: 'Metered limit baseline',
  description:
    'Conservative starting capacity for an unproven principal — the limits the metered trust ladder pays credits into.',
  limits: [
    { name: 'api_requests_per_day', max: 500 },
    { name: 'outbound_messages_per_day', max: 5 },
    { name: 'invites_sent', max: 2 },
  ],
};
