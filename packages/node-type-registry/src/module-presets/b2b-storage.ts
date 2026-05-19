import type { ModulePreset } from './types';

/**
 * `b2b:storage` — everything in `b2b` plus `storage_module` for file uploads.
 *
 * This is the common shape for B2B SaaS apps that need file upload
 * infrastructure tied to their org/workspace structure. The storage module
 * creates `app_buckets` and `app_files` tables with RLS policies, and
 * entity-type-level storage scopes can be provisioned on top.
 *
 * If you don't need orgs, use a lighter preset and add `storage_module`
 * separately via provisioning options.
 */
export const PresetB2bStorage: ModulePreset = {
  name: 'b2b:storage',
  display_name: 'B2B SaaS + File Storage',
  summary: '`b2b` + file upload infrastructure (buckets, files, RLS).',
  description:
    'Everything in `b2b` (auth:hardened + orgs + invites + permissions + levels + profiles + ' +
    'hierarchy), plus `storage_module` for file uploads. The storage module creates ' +
    '`app_buckets` and `app_files` tables with full RLS: AuthzPublishable for public reads, ' +
    'AuthzAppMembership for member access, AuthzDirectOwner for uploader-only modify/delete. ' +
    'Entity-type provisioning with a non-empty `storage` array adds per-scope storage tables ' +
    'automatically (multiple modules per entity via storage_key). Choose this when your B2B ' +
    'app needs file uploads, avatars, attachments, or any object storage tied to workspaces.',
  good_for: [
    'B2B SaaS with file uploads (documents, avatars, attachments)',
    'Apps where storage is scoped to orgs/workspaces',
    'Apps that need per-entity-type file storage (e.g., project files, team assets)'
  ],
  not_for: [
    'Single-tenant consumer apps — use `auth:email` or `auth:hardened` and add storage separately',
    'Apps without file upload needs — use `b2b` to avoid the storage table overhead'
  ],
  modules: [
    'users_module',
    'membership_types_module',
    'permissions_module:app',
    'permissions_module:org',
    'limits_module:app',
    'limits_module:org',
    'levels_module:app',
    'levels_module:org',
    'memberships_module:app',
    'memberships_module:org',
    'sessions_module',
    'user_state_module',
    'config_secrets_user_module',
    'emails_module',
    'rls_module',
    'user_auth_module',
    'session_secrets_module',
    'rate_limits_module',
    'connected_accounts_module',
    'identity_providers_module',
    'webauthn_credentials_module',
    'webauthn_auth_module',
    'phone_numbers_module',
    'profiles_module:app',
    'profiles_module:org',
    'hierarchy_module:org',
    'invites_module:app',
    'invites_module:org',
    'storage_module',
    'devices_module'
  ],
  includes_notes: {
    storage_module: 'File upload infrastructure: app_buckets + app_files tables with RLS. Entity-type storage scopes layered on top via the `storage` array (array-only format, supports multiple modules per entity via storage_key).',
    devices_module: 'Device tracking and trusted-device MFA bypass.'
  },
  omits_notes: {
    crypto_addresses_module: 'Not a web3 preset.'
  },
  extends: ['b2b']
};
