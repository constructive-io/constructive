import type { ModulePreset } from './types';

/**
 * `minimal` — users + sessions + RLS + API keys. No auth procedures, no
 * memberships, no orgs, no emails, no passwords.
 *
 * This is the barest foundation: a `users` table, a `sessions` table so
 * something upstream can mint tokens, `rls_module` so row-level security
 * is enforceable, and `secrets_module` so you can issue API keys. Nothing
 * else.
 *
 * You still write your own identity bridge on top (or rely on a header-based
 * user-id coming from an upstream proxy / JWT verifier).
 */
export const PresetMinimal: ModulePreset = {
  name: 'minimal',
  display_name: 'Minimal (RLS only)',
  summary: 'users + sessions + RLS + API keys. No auth procedures installed.',
  description:
    'The smallest coherent Constructive install. You get a users table, a sessions table, ' +
    'RLS enforcement, and API-key infrastructure — but no server-side sign_up/sign_in flow. ' +
    'Pick this when authentication lives outside the database (an upstream IdP, a header from ' +
    'a proxy, an internal service-to-service JWT) and Constructive is just the RLS-aware data ' +
    'layer underneath.',
  good_for: [
    'Internal tools where an upstream proxy supplies the user identity',
    'Backend-of-backend services that only need RLS, not an auth surface',
    'Prototypes that will bolt on a richer auth preset later'
  ],
  not_for: [
    'Any app that needs `sign_up` / `sign_in` / `reset_password` out of the box — use `auth:email` instead',
    'Multi-tenant / org-scoped apps — use `b2b`'
  ],
  modules: [
    'users_module',
    'sessions_module',
    'rls_module',
    'secrets_module'
  ],
  includes_notes: {
    users_module: 'The canonical users table. Required by every preset.',
    sessions_module: 'Session/token storage; needed so whatever upstream auth can mint a session row.',
    rls_module: 'RLS policy infrastructure. Without it, row-level security is not enforced.',
    secrets_module: 'API-key storage. Optional for this preset but almost always wanted alongside upstream auth.'
  },
  omits_notes: {
    user_auth_module: 'No server-side sign_up/sign_in procedures in this preset.',
    emails_module: 'Not needed without password/magic-link flows; upstream auth handles identity.',
    memberships_module: 'No memberships without a user_auth_module wiring them up.'
  }
};
