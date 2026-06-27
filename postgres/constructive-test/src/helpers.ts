import { randomUUID } from 'crypto';
import { PresetFull } from 'node-type-registry';

/**
 * Generate a unique name with UUID suffix.
 * Uses hyphens for hostname-safe names (subdomains can't have underscores).
 */
export function uniqueName(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 12)}`;
}

/** Module entry: either a plain string or a [name, options] tuple. */
export type ModuleEntry = string | [string, Record<string, unknown>];

/**
 * Convert a ModuleEntry[] to a JSON string for the jsonb v_modules parameter.
 */
export function toJsonbModules(modules: readonly ModuleEntry[]): string {
  return JSON.stringify(modules);
}

/**
 * Common module combinations for provision_database.
 *
 * Sourced from node-type-registry module presets.
 * Use the narrowest preset that covers what your test actually exercises.
 */
export const MODULE_PRESETS = {
  MINIMAL: JSON.stringify(['users_module']),
  WITH_SESSIONS: JSON.stringify(['users_module', 'sessions_module']),

  AUTH_EMAIL: JSON.stringify([
    'users_module', 'membership_types_module',
    ['permissions_module', { scope: 'app' }], ['limits_module', { scope: 'app' }],
    ['events_module', { scope: 'app' }], ['memberships_module', { scope: 'app' }],
    'sessions_module', 'user_state_module', 'user_credentials_module',
    'config_secrets_module', 'emails_module', 'rls_module', 'user_auth_module',
  ]),

  WITH_STORAGE: JSON.stringify([
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
  ]),

  B2B: JSON.stringify([
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
  ]),

  APP_LEVEL: JSON.stringify([
    'users_module', 'membership_types_module',
    ['permissions_module', { scope: 'app' }], ['limits_module', { scope: 'app' }],
    ['memberships_module', { scope: 'app' }], ['events_module', { scope: 'app' }],
  ]),

  ORG_LEVEL: JSON.stringify([
    'users_module', 'membership_types_module',
    ['permissions_module', { scope: 'app' }], ['limits_module', { scope: 'app' }],
    ['memberships_module', { scope: 'app' }],
    ['permissions_module', { scope: 'org' }], ['limits_module', { scope: 'org' }],
    ['memberships_module', { scope: 'org' }],
  ]),

/**
   * Every standard module — sourced from PresetFull in node-type-registry.
   * Usage logging modules are NOT included — they are opt-in.
   */
  ALL: JSON.stringify(PresetFull.modules),
} as const;

/**
 * Same modules as MODULE_PRESETS.ALL but as a TS array.
 * Use for GraphQL mutations that accept `string[]` instead of SQL array literals.
 */
export const ALL_MODULES_ARRAY: readonly ModuleEntry[] = PresetFull.modules;

/**
 * Append module names to a JSON-array preset string.
 */
export function appendModules(preset: string, ...modules: string[]): string {
  const arr = JSON.parse(preset);
  arr.push(...modules);
  return JSON.stringify(arr);
}

