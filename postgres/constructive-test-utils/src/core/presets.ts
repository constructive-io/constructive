/**
 * Module entry type: either a string name or [name, options] tuple.
 */
export type ModuleEntry = string | [string, Record<string, unknown>];

/**
 * Pre-configured module sets for common test scenarios.
 * Use the narrowest preset that covers what your test exercises.
 *
 * These map 1:1 to modules defined in the pgpm-modules repo,
 * registered via metaschema_modules_public.*.
 */
export const MODULE_PRESETS = {
  /** Just users_module — absolute minimum for any test */
  MINIMAL: ['users_module'] as ModuleEntry[],

  /** Users + sessions */
  WITH_SESSIONS: ['users_module', 'sessions_module'] as ModuleEntry[],

  /**
   * Standard email/password auth — sign_up, sign_in, set_password, reset_password,
   * verify_email, bootstrap_user. No orgs, SSO, MFA.
   * ~12 modules, ~20 tables.
   */
  AUTH_EMAIL: [
    'users_module', 'membership_types_module',
    ['permissions_module', { scope: 'app' }], ['limits_module', { scope: 'app' }],
    ['events_module', { scope: 'app' }], ['memberships_module', { scope: 'app' }],
    'sessions_module', 'user_state_module', 'user_credentials_module',
    'config_secrets_module', 'emails_module', 'rls_module', 'user_auth_module',
  ] as ModuleEntry[],

  /** App-level modules (users + memberships + events + permissions + limits) */
  APP_LEVEL: [
    'users_module', 'membership_types_module',
    ['permissions_module', { scope: 'app' }], ['limits_module', { scope: 'app' }],
    ['memberships_module', { scope: 'app' }], ['events_module', { scope: 'app' }],
  ] as ModuleEntry[],

  /** App + org level modules */
  ORG_LEVEL: [
    'users_module', 'membership_types_module',
    ['permissions_module', { scope: 'app' }], ['limits_module', { scope: 'app' }],
    ['memberships_module', { scope: 'app' }],
    ['permissions_module', { scope: 'org' }], ['limits_module', { scope: 'org' }],
    ['memberships_module', { scope: 'org' }],
  ] as ModuleEntry[],

  /** App + group level modules */
  GROUP_LEVEL: [
    'users_module', 'membership_types_module',
    ['permissions_module', { scope: 'app' }], ['limits_module', { scope: 'app' }],
    ['memberships_module', { scope: 'app' }],
    ['permissions_module', { scope: 'group' }], ['limits_module', { scope: 'group' }],
    ['memberships_module', { scope: 'group' }],
  ] as ModuleEntry[],

  /**
   * Full B2B stack: auth + orgs + invites + permissions + levels + profiles + hierarchy.
   * Use for multi-tenant RLS tests, cross-tenant tests, etc.
   */
  B2B: [
    'users_module', 'membership_types_module',
    ['memberships_module', { scope: 'app' }], ['memberships_module', { scope: 'org' }],
    'sessions_module', 'user_state_module', 'user_credentials_module',
    'config_secrets_module', 'emails_module', 'rls_module', 'user_auth_module',
    'session_secrets_module', 'rate_limits_module',
    'connected_accounts_module', 'identity_providers_module',
    'webauthn_credentials_module', 'webauthn_auth_module', 'phone_numbers_module',
    ['permissions_module', { scope: 'app' }], ['permissions_module', { scope: 'org' }],
    ['limits_module', { scope: 'app' }], ['limits_module', { scope: 'org' }],
    ['events_module', { scope: 'app' }], ['events_module', { scope: 'org' }],
    ['profiles_module', { scope: 'app' }], ['profiles_module', { scope: 'org' }],
    ['hierarchy_module', { scope: 'org' }],
    ['invites_module', { scope: 'app' }], ['invites_module', { scope: 'org' }],
  ] as ModuleEntry[],

  /** B2B + storage_module — for storage/minio tests */
  WITH_STORAGE: [
    'users_module', 'membership_types_module',
    ['memberships_module', { scope: 'app' }], ['memberships_module', { scope: 'org' }],
    'sessions_module', 'user_state_module', 'user_credentials_module',
    'config_secrets_module', 'emails_module', 'rls_module', 'user_auth_module',
    'session_secrets_module', 'rate_limits_module',
    'connected_accounts_module', 'identity_providers_module',
    'webauthn_credentials_module', 'webauthn_auth_module', 'phone_numbers_module',
    ['permissions_module', { scope: 'app' }], ['permissions_module', { scope: 'org' }],
    ['limits_module', { scope: 'app' }], ['limits_module', { scope: 'org' }],
    ['events_module', { scope: 'app' }], ['events_module', { scope: 'org' }],
    ['profiles_module', { scope: 'app' }], ['profiles_module', { scope: 'org' }],
    ['hierarchy_module', { scope: 'org' }],
    ['invites_module', { scope: 'app' }], ['invites_module', { scope: 'org' }],
    'storage_module',
  ] as ModuleEntry[],
} as const;

/**
 * Convert ModuleEntry[] to a JSON string for provision_database().
 */
export function toJsonbModules(modules: readonly ModuleEntry[]): string {
  return JSON.stringify(modules);
}

/**
 * Append additional modules to an existing preset.
 */
export function appendModules(
  preset: readonly ModuleEntry[],
  ...extra: ModuleEntry[]
): ModuleEntry[] {
  return [...preset, ...extra];
}
