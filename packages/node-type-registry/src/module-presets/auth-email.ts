import type { ModulePreset } from './types';

/**
 * `auth:email` — email + password sign_up/sign_in. No orgs, no SSO, no SMS,
 * no passkeys, no rate limits.
 *
 * This is the "working consumer login in one step" preset. It installs the
 * `user_auth_module` and all the tables its insert trigger hard-requires,
 * giving you the standard procedures: `sign_up`, `sign_in`, `sign_out`,
 * `set_password`, `reset_password`, `forgot_password`, `verify_email`,
 * `delete_account`, `my_sessions`, API-key CRUD. Nothing more.
 *
 * It deliberately excludes rate limits, connected accounts / identity
 * providers (OAuth), WebAuthn (passkeys), phone numbers (SMS), invites,
 * permissions, and org-scoped memberships. Bolt those on by moving to a
 * richer preset (`auth:hardened`, `b2b`) when you actually need them.
 */
export const PresetAuthEmail: ModulePreset = {
  name: 'auth:email',
  display_name: 'Email + Password',
  summary: 'Standard email/password auth flow. No orgs, no SSO, no MFA, no rate limits.',
  description:
    'Installs `user_auth_module` with exactly the table dependencies its insert trigger ' +
    'hard-requires: users, app-scoped memberships, emails, secrets, encrypted secrets, ' +
    'sessions, plus RLS. You get the standard password-based auth procedures (sign_up, ' +
    "sign_in, reset_password, verify_email, delete_account, ...) and that's it. " +
    'Everything else in the module catalog — SSO, passkeys, SMS, rate limits, orgs, ' +
    'invites, permissions — is deliberately omitted. This is the right shape for single-tenant ' +
    'consumer apps in the first weeks, internal tools that need a real login, or anything ' +
    'where you want the lightest possible working auth and will add complexity only when ' +
    'forced to.',
  good_for: [
    'Single-tenant consumer apps in the first week of development',
    'Internal tools where one simple login is enough',
    'Demos and hobby projects that need real password auth',
    'B2C SaaS before org/team features are needed'
  ],
  not_for: [
    'Apps with org/team/workspace structure — use `b2b`',
    'Apps that need SSO or passkeys from day one — use `auth:sso` or `auth:passkey`',
    'Production apps at scale — use `auth:hardened` (adds rate limits, SSO, passkeys, SMS)'
  ],
  modules: [
    'users_module',
    'membership_types_module',
    'memberships_module:app',
    'sessions_module',
    'secrets_module',
    'encrypted_secrets_module',
    'emails_module',
    'rls_module',
    'user_auth_module'
  ],
  includes_notes: {
    'memberships_module:app': 'Required by `user_auth_module`: every user gets an app-level membership row at sign-up.',
    membership_types_module: "Required by `memberships_module:app`; defines the 'app' scope.",
    emails_module: 'Required by the `user_auth_module` insert trigger (`RAISE EXCEPTION REQUIRES emails_module`).',
    encrypted_secrets_module: 'Required for password hashing; referenced by `set_password`, `verify_password`, and reset flows.',
    secrets_module: 'API-key storage (`create_api_key`, `revoke_api_key`, `my_api_keys`).'
  },
  omits_notes: {
    rate_limits_module: 'Omitted intentionally; throttle_* helpers are null-safe and the auth procs compile without it. Add later via `auth:hardened`.',
    connected_accounts_module: 'No OAuth / SSO in this preset — add `auth:sso`.',
    identity_providers_module: 'No OAuth provider configs without connected_accounts.',
    webauthn_credentials_module: 'No passkeys — add `auth:passkey`.',
    phone_numbers_module: 'No SMS login — add `auth:hardened` or the SMS-only refactor path.',
    'memberships_module:org': 'No org/team structure — move to `b2b` when you need one.',
    'permissions_module:app': 'No fine-grained RBAC; the `is_admin` flag on users is the only gate.',
    invites_module: 'Self-serve signup only.',
    session_secrets_module: 'No magic-link / email-OTP nonces; add `auth:email+magic`.'
  }
};
