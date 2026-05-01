import type { ModulePreset } from './types';

/**
 * `auth:email+magic` — `auth:email` plus passwordless email flows.
 *
 * Adds `session_secrets_module`, which is where one-time nonces for magic
 * links and email OTPs are stored. Once installed, the `user_auth_module`
 * emits `sign_up_magic_link`, `sign_in_magic_link`, and `sign_in_email_otp`
 * procedures (gated on the equivalent `allow_*` toggles in
 * `app_settings_auth`).
 *
 * Choose this over `auth:email` when you want users to be able to log in
 * without ever setting a password — but still only over email (no SMS, no
 * SSO).
 */
export const PresetAuthEmailMagic: ModulePreset = {
  name: 'auth:email+magic',
  display_name: 'Email + Magic Link / OTP',
  summary: 'Everything in `auth:email` plus magic-link and email-OTP passwordless flows.',
  description:
    'Same password-based auth as `auth:email`, with `session_secrets_module` added so the ' +
    'generator emits the passwordless procedures: `sign_up_magic_link`, `sign_in_magic_link`, ' +
    '`sign_in_email_otp`. Password flows still exist — you opt into passwordless-only by ' +
    'flipping the `allow_password_sign_*` toggles off in `app_settings_auth` after install. ' +
    'This is the right step up from `auth:email` when you want to ship magic links without yet ' +
    'taking on SSO or passkeys.',
  good_for: [
    'Consumer apps that want passwordless from day one',
    'Apps targeting users who forget passwords (newsletters, one-off tools)',
    'Hardening path from `auth:email` without jumping all the way to `auth:hardened`'
  ],
  not_for: [
    'Apps that need SSO or passkeys — use `auth:sso` or `auth:passkey`',
    'Production at scale — use `auth:hardened` for rate limiting'
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
    'user_auth_module',
    'session_secrets_module'
  ],
  includes_notes: {
    session_secrets_module: 'Stores nonces for magic-link and email-OTP flows. Without it those procedures are not emitted.'
  },
  omits_notes: {
    rate_limits_module: 'Same reasoning as `auth:email` — add later via `auth:hardened`.',
    connected_accounts_module: 'No OAuth / SSO in this preset.',
    webauthn_credentials_module: 'No passkeys — add `auth:passkey`.',
    phone_numbers_module: 'No SMS — add `auth:hardened`.'
  },
  extends: ['auth:email']
};
