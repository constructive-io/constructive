import type { ModulePreset } from './types';

/**
 * `auth:hardened` — email/password auth with rate limiting, SSO, passkeys,
 * SMS, and magic-link / OTP infrastructure all installed. Production-ready
 * consumer auth with the full identifier matrix.
 *
 * Still single-tenant (no orgs / teams / invites). For multi-tenant B2B,
 * step up to `b2b:storage`.
 */
export const PresetAuthHardened: ModulePreset = {
  name: 'auth:hardened',
  display_name: 'Hardened (all auth surfaces)',
  summary: 'Rate limits + SSO + passkeys + SMS + magic links. Production-grade consumer auth.',
  description:
    'Email/password sign-in, plus every optional auth module that fits inside the single-tenant ' +
    'model: `rate_limits_module` for throttling (protects sign-in, password reset, and ' +
    'signup flows), `connected_accounts_module` + `identity_providers_module` for SSO, ' +
    '`webauthn_credentials_module` + `webauthn_auth_module` for passkeys, ' +
    '`session_secrets_module` for magic-link / email-OTP nonces, and ' +
    '`phone_numbers_module` for SMS flows. Every login identifier is available; ' +
    'toggle whichever ones you want off via `app_settings_auth.allow_*` columns. ' +
    'An `events_module` carries the `humanity` trust ladder, so an account can earn ' +
    '`level.reachable` from a verified channel and a policy can gate on it. ' +
    'Choose this for any production consumer app; step up to `b2b:storage` once you need orgs.',
  good_for: [
    'Production consumer apps with a serious user base',
    'Apps that need every identifier available (email, SSO, passkey, SMS) with throttling',
    'Apps doing a progressive rollout of auth methods — everything is installed, you toggle per method'
  ],
  not_for: [
    'Hobby projects / demos — way too much infrastructure; use `minimal` and add auth modules',
    'Multi-tenant B2B apps — use `b2b:storage`, which layers orgs + invites + capabilities on top'
  ],
  modules: [
    'users_module',
    'membership_types_module',
    ['capabilities_module', { scope: 'app' }],
    ['limits_module', { scope: 'app' }],
    // Levels come from the events module — `levels_module` is not a provisioned
    // module, so the entry this replaces installed nothing and an account could
    // not earn a level at all.
    ['events_module', { scope: 'app', trust_ladder: 'humanity' }],
    ['memberships_module', { scope: 'app' }],
    'sessions_module',
    'user_state_module',
    'user_credentials_module',
    ['internal_secrets_module', { scope: 'app' }],
    'emails_module',
    'rls_module',
    'user_auth_module',
    'session_secrets_module',
    'rate_limits_module',
    'connected_accounts_module',
    ['identity_providers_module', { scope: 'app' }],
    'webauthn_credentials_module',
    'webauthn_auth_module',
    'phone_numbers_module',
    'devices_module',
    'user_settings_security_module'
  ]
};
