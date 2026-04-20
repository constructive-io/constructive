import type { ModulePreset } from './types';

/**
 * `auth:passkey` — `auth:email` plus WebAuthn / passkeys.
 *
 * Adds `webauthn_credentials_module` (stores each user's registered public
 * keys and credential IDs), `webauthn_auth_module` (the auth-time challenge
 * storage + flow), and `session_secrets_module` (where the one-time
 * challenge nonces live). The generator then emits WebAuthn registration
 * and assertion procedures.
 *
 * Password flows stay on by default as a recovery path; toggle them off in
 * `app_settings_auth` if you want strictly-passkey.
 */
export const PresetAuthPasskey: ModulePreset = {
  name: 'auth:passkey',
  display_name: 'Passkeys (WebAuthn)',
  summary: '`auth:email` plus WebAuthn passkey registration and assertion.',
  description:
    "Installs the three modules WebAuthn needs: `webauthn_credentials_module` for each user's " +
    "registered public keys, `webauthn_auth_module` for the runtime challenge/assertion flow, " +
    "and `session_secrets_module` for the one-time challenge nonces. With these installed, " +
    "the generator emits WebAuthn registration/login procs. Keep password flows as a recovery " +
    "path, or disable them in `app_settings_auth` for passkey-only deployments.",
  good_for: [
    'Apps where you want users to adopt phishing-resistant auth',
    'Consumer apps with a tech-forward audience',
    'Internal tools protecting sensitive data where FIDO2 is a requirement'
  ],
  not_for: [
    'Apps that also need SSO or SMS — use `auth:hardened` for everything',
    'Apps where the end-user device mix is heavy on old browsers that lack WebAuthn'
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
    'session_secrets_module',
    'webauthn_credentials_module',
    'webauthn_auth_module'
  ],
  includes_notes: {
    webauthn_credentials_module: 'Per-user WebAuthn credential storage. Without it, passkey registration does not compile.',
    webauthn_auth_module: 'Runtime challenge + assertion flow.',
    session_secrets_module: 'Challenge nonces for registration and assertion.'
  },
  omits_notes: {
    rate_limits_module: 'Add via `auth:hardened` for production.',
    connected_accounts_module: 'No OAuth / SSO — add via `auth:hardened`.',
    phone_numbers_module: 'No SMS.'
  },
  extends: ['auth:email']
};
