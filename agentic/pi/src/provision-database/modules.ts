// Explicit module list for database provisioning.
//
// The backend SILENTLY DROPS the `['all']` sentinel (constructive-db #1273),
// provisioning ZERO modules and leaving downstream tables (e.g. limits_table_id)
// NULL. We mirror constructive-client's DEFAULT_PROVISION_MODULES exactly.
// Scoped/configured modules are `[name, options]` tuples. See PROVISION-API-001.
export type ProvisionModule = string | [string, Record<string, unknown>];

export const DEFAULT_PROVISION_MODULES: ProvisionModule[] = [
  'users_module',
  'membership_types_module',
  ['permissions_module', { scope: 'app' }],
  ['permissions_module', { scope: 'org' }],
  ['limits_module', { scope: 'app' }],
  ['limits_module', { scope: 'org' }],
  ['levels_module', { scope: 'app' }],
  ['levels_module', { scope: 'org' }],
  ['memberships_module', { scope: 'app' }],
  ['memberships_module', { scope: 'org' }],
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
  ['profiles_module', { scope: 'app' }],
  ['profiles_module', { scope: 'org' }],
  ['hierarchy_module', { scope: 'org' }],
  ['invites_module', { scope: 'app' }],
  ['invites_module', { scope: 'org' }],
  // Mirrors constructive-client: api_name links storage to the same api-<slug>
  // endpoint the generated SDK targets (without it uploads fail with "not
  // enabled for this endpoint"), prefix keeps app_buckets/app_files names off
  // user tables, and buckets seeds the public bucket row uploads need.
  [
    'storage_module',
    { scope: 'app', api_name: 'api', prefix: 'app', buckets: [{ key: 'public', is_public: true }] },
  ],
  'devices_module',
];
