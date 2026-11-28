import type { ModulePreset } from './types';

/**
 * `auth:byo` — Constructive's users, organizations, memberships,
 * capabilities, limits, profiles and hierarchy, with no authentication
 * surface. Authentication and the API layer belong to the adopter.
 *
 * Identity arrives on the transaction as the claims contract
 * (`docs/architecture/claims-contract.md`): a role (`authenticated` /
 * `anonymous`) and `jwt.claims.user_id`. Every Authz* policy the membership
 * planes compile reads `jwt_public.current_user_id()`, so nothing here needs
 * a session, a credential, or a sign-in procedure.
 *
 * Invites and events are opt-in: add `invites_module` (needs `emails_module`)
 * or `events_module` per scope when the app wants them.
 */
export const PresetAuthByo: ModulePreset = {
  name: 'auth:byo',
  display_name: 'Bring Your Own Auth',
  summary: 'Users + orgs + memberships + capabilities + RLS. Authentication and API layer are yours.',
  description:
    'Constructive as the multi-tenant authorization layer underneath your own authentication. ' +
    'You get users, organizations (org memberships, hierarchy, profiles), app and org ' +
    'capabilities and limits, and every Authz* policy type — but no sessions, credentials, ' +
    'emails, or sign_up/sign_in procedures. Your API layer verifies its own tokens and sets the ' +
    'role plus `jwt.claims.user_id` (and ideally `jwt.claims.database_id`) on each transaction; ' +
    'the provider subject is a UUID used directly as `users.id`, and your service role inserts ' +
    'the user row the first time it sees one. Add `invites_module` or `events_module` when you ' +
    'need them.',
  good_for: [
    'Apps that keep an existing IdP (Auth0, Clerk, Supabase Auth, Cognito, in-house)',
    'Teams that run their own API layer and want Constructive orgs, memberships and RLS',
    'B2B apps whose sign-in must stay outside the database',
  ],
  not_for: [
    'Apps that want Constructive to own sign-up and sign-in — use `auth:hardened` or `b2b:storage`',
    'Single-tenant apps with no organizations — use `minimal`',
    'Providers whose subject is not a UUID, until a mapping table exists — keep your own map to `users.id`',
  ],
  modules: [
    'users_module',
    'membership_types_module',
    ['capabilities_module', { scope: 'app' }],
    ['capabilities_module', { scope: 'org' }],
    ['limits_module', { scope: 'app' }],
    ['limits_module', { scope: 'org' }],
    ['memberships_module', { scope: 'app' }],
    ['memberships_module', { scope: 'org' }],
    ['profiles_module', { scope: 'app' }],
    ['profiles_module', { scope: 'org' }],
    ['hierarchy_module', { scope: 'org' }],
  ],
};
