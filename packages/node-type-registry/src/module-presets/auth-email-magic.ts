import type { ModulePreset } from './types';

export const PresetAuthEmailMagic: ModulePreset = {
  name: 'auth:email+magic',
  display_name: 'Email + Magic Link / OTP',
  summary:
    'Everything in `auth:email` plus magic-link and email-OTP passwordless flows.',
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
    ['permissions_module', { scope: 'app' }],
    ['limits_module', { scope: 'app' }],
    ['levels_module', { scope: 'app' }],
    ['memberships_module', { scope: 'app' }],
    'sessions_module',
    'user_state_module',
    'user_credentials_module',
    ['internal_secrets_module', { scope: 'app' }],
    'emails_module',
    'rls_module',
    'user_auth_module',
    'session_secrets_module'
  ],
  extends: ['auth:email']
};
