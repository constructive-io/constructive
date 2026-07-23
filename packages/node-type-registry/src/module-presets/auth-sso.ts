import type { ModulePreset } from './types';

/**
 * `auth:sso` — `auth:email` plus OAuth / OpenID Connect sign-in.
 *
 * Adds `connected_accounts_module` (the junction table mapping a user to
 * `(provider, external_id)`) and `identity_providers_module` (the provider
 * config: URLs, client_id, encrypted client_secret, scopes, PKCE/nonce
 * knobs). The generator then emits `sign_in_identity` / `sign_up_identity`
 * procedures which rely on `internal_secrets_module` to decrypt the client
 * secret at auth time.
 *
 * Password fallback stays on by default (break-glass for admins); flip the
 * `allow_password_sign_*` toggles off in `app_settings_auth` for strictly
 * SSO-only.
 *
 * Note: `emails_module` is still required — the `user_auth_module` insert
 * trigger hard-requires it today. A pure SSO-only install without emails
 * is a separate refactor (see `docs/architecture/module-presets.md` in
 * constructive-db).
 */
export const PresetAuthSso: ModulePreset = {
  name: 'auth:sso',
  display_name: 'OAuth / OpenID Connect',
  summary: '`auth:email` plus OAuth providers and connected-account linkage.',
  description:
    'Adds the two modules that make SSO work: `identity_providers_module` (where provider ' +
    'definitions live — Google, GitHub, Okta, etc., with their URLs, client IDs, and ' +
    'encrypted client secrets) and `connected_accounts_module` (the junction mapping a ' +
    'Constructive user to a `(provider, external_id)` pair). The generator emits ' +
    '`sign_in_identity` and `sign_up_identity` procedures which decrypt the client secret ' +
    'through `internal_secrets_module` at auth time. Keep password flows as break-glass, or ' +
    'disable them via `app_settings_auth` toggles for strictly-SSO deployments.',
  good_for: [
    'B2B apps where end users sign in via their employer IdP',
    'Consumer apps that want "Sign in with Google / GitHub"',
    'Apps that need to federate identity with a specific provider ecosystem'
  ],
  not_for: [
    'Apps that also need passkeys and rate limits — use `auth:hardened`',
    'Strictly-SSO apps that want NO email storage — needs the emails-optional refactor; not supported by a preset today'
  ],
  modules: [
    'users_module',
    'membership_types_module',
    ['permissions_module', { scope: 'app' }],
    ['limits_module', { scope: 'app' }],
    ['levels_module', { scope: 'app' }],
    ['memberships_module', { scope: 'app' }],
    'sessions_module',
    'user_state_module',
    'user_credentials_module',
    'internal_secrets_module',
    'emails_module',
    'rls_module',
    'user_auth_module',
    'connected_accounts_module',
    'identity_providers_module'
  ],
  extends: ['auth:email']
};
