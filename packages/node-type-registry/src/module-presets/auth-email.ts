import type { ModulePreset } from './types';

export const PresetAuthEmail: ModulePreset = {
  name: 'auth:email',
  display_name: 'Email + Password',
  summary:
    'Standard email/password auth flow with app-level permissions. No orgs, no SSO, no MFA.',
  description:
    'Installs `user_auth_module` with exactly the table dependencies its insert trigger ' +
    'hard-requires: users, app-scoped memberships (plus their permissions/limits/levels ' +
    'dependencies), emails, user state, user secrets, sessions, plus RLS. You get the ' +
    'standard password-based auth procedures (sign_up, sign_in, reset_password, ' +
    "verify_email, delete_account, ...) and that's it. Everything else in the module " +
    'catalog — SSO, passkeys, SMS, rate limits, orgs, invites — is deliberately omitted. ' +
    'This is the right shape for single-tenant consumer apps in the first weeks, internal ' +
    'tools that need a real login, or anything where you want the lightest possible working ' +
    'auth and will add complexity only when forced to.',
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
    'user_auth_module'
  ]
};
