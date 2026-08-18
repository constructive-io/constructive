import type { ModulePreset } from './types';

/**
 * `b2b:storage` — `auth:hardened` plus orgs, invites, capabilities, levels,
 * profiles, hierarchy, and `storage_module` for file uploads. The full
 * multi-tenant / B2B SaaS shape.
 *
 * This is the common shape for B2B SaaS apps that need file upload
 * infrastructure tied to their org/workspace structure. The storage module
 * creates `buckets` and `files` tables with RLS policies on the `objects` API,
 * and entity-type-level storage scopes can be provisioned on top.
 *
 * If you don't need orgs, use a lighter preset and add `storage_module`
 * separately via provisioning options.
 */
export const PresetB2bStorage: ModulePreset = {
  name: 'b2b:storage',
  display_name: 'B2B SaaS + File Storage',
  summary: 'Orgs + invites + capabilities + file upload infrastructure (buckets, files, RLS).',
  description:
    'Everything in `auth:hardened`, plus orgs, invites, capabilities, profiles and hierarchy at ' +
    'both app and org membership scopes, an `events_module` at both scopes carrying the ' +
    '`humanity` trust ladder (so a member can earn `level.reachable` and a policy can gate on ' +
    'it), and `storage_module` for file uploads, exposed on the `storage` API. The storage ' +
    'module creates `app_buckets` and `app_files` tables with full RLS: AuthzPublishable for public reads, ' +
    'AuthzAppMembership for member access, AuthzDirectOwner for uploader-only modify/delete. ' +
    'Entity-type provisioning with a non-empty `storage` array adds per-scope storage tables ' +
    'automatically (multiple modules per entity via key). Choose this when your B2B ' +
    'app needs file uploads, avatars, attachments, or any object storage tied to workspaces.',
  good_for: [
    'B2B SaaS with file uploads (documents, avatars, attachments)',
    'Apps where storage is scoped to orgs/workspaces',
    'Apps that need per-entity-type file storage (e.g., project files, team assets)'
  ],
  not_for: [
    'Single-tenant consumer apps — use `auth:hardened` and add storage separately',
    'Apps without file upload needs — drop `storage_module` from the module list'
  ],
  modules: [
    'users_module',
    'membership_types_module',
    ['capabilities_module', { scope: 'app' }],
    ['capabilities_module', { scope: 'org' }],
    ['limits_module', { scope: 'app' }],
    ['limits_module', { scope: 'org' }],
    // Levels come from the events module — `levels_module` is not a provisioned
    // module, so the entries this replaces installed nothing and a B2B database
    // could not earn a level at all. `humanity` at both scopes: the app ladder
    // is seeded at provision, the org ladder rides each organization's insert.
    ['events_module', { scope: 'app', trust_ladder: 'humanity' }],
    ['events_module', { scope: 'org', trust_ladder: 'humanity' }],
    ['memberships_module', { scope: 'app' }],
    ['memberships_module', { scope: 'org' }],
    'sessions_module',
    'user_state_module',
    'user_credentials_module',
    ['internal_secrets_module', { scope: 'app' }],
    ['internal_config_module', { scope: 'app' }],
    'emails_module',
    'rls_module',
    'user_auth_module',
    'session_secrets_module',
    'rate_limits_module',
    'connected_accounts_module',
    ['identity_providers_module', { scope: 'app' }],
    // The leg between the two above: while the browser is at the provider, the
    // database holds the state it must echo back with the PKCE verifier that
    // belongs to it. A tenant with providers configured and no place to keep
    // that has an SSO surface it cannot complete a sign-in through.
    ['oauth_requests_module', { scope: 'app' }],
    'webauthn_credentials_module',
    'webauthn_auth_module',
    'phone_numbers_module',
    ['profiles_module', { scope: 'app' }],
    ['profiles_module', { scope: 'org' }],
    ['hierarchy_module', { scope: 'org' }],
    ['invites_module', { scope: 'app' }],
    ['invites_module', { scope: 'org' }],
    // Binds the database to the typed catalog plane. Buckets are routable
    // targets only through the buckets catalog, so storage_module requires it.
    ['catalog_module', { scope: 'app' }],
    // Routing and naming both come from the module defaults: the storage API
    // (api_name defaults to 'storage') and the app_ prefix auto-filled from scope.
    ['storage_module', { scope: 'app' }],
    'devices_module',
    'user_settings_security_module'
  ],
  extends: ['auth:hardened']
};
