import type { ModulePreset } from './types';

/**
 * `b2b` — `auth:hardened` plus orgs, invites, permissions, levels,
 * profiles, and hierarchy. The full multi-tenant / B2B SaaS shape.
 *
 * Installs both app-scoped AND org-scoped instances of the membership,
 * permission, limit, level, profile, and invite modules. `hierarchy_module`
 * at the org scope enables nested org/team structures.
 *
 * This is a large install — every B2B concept Constructive ships. Don't
 * reach for it until you actually need orgs; moving from `auth:hardened`
 * to `b2b` later is a provisioning step, not a schema rewrite.
 */
export const PresetB2b: ModulePreset = {
  name: 'b2b',
  display_name: 'B2B SaaS (orgs + invites + permissions)',
  summary: '`auth:hardened` + orgs, invites, fine-grained permissions, levels, profiles, hierarchy.',
  description:
    'Everything in `auth:hardened`, plus the full org/team/permission stack at both app and ' +
    'org membership scopes. You get: `memberships_module:org` for org-scoped memberships, ' +
    '`permissions_module:app/:org` for fine-grained RBAC, `limits_module:app/:org` for per-scope ' +
    'quota enforcement, `levels_module:app/:org` for role bundles, `profiles_module:app/:org` ' +
    'for per-scope user display info, `hierarchy_module:org` for nested org structures, and ' +
    '`invites_module:app/:org` for invite flows at either scope. Choose this when the app has ' +
    'the concept of a "workspace" / "team" / "tenant" that users belong to and act within.',
  good_for: [
    'B2B SaaS with multi-tenant workspaces / teams',
    'Apps where permissions scope to an organization, not globally',
    'Apps with an invite-based onboarding flow (admins invite members)',
    'Apps that need nested org hierarchies (parent org / sub-org / team)'
  ],
  not_for: [
    'Single-tenant consumer apps — use `auth:hardened` or `auth:email`',
    'Apps where all users see the same global dataset — orgs would add overhead with no benefit'
  ],
  modules: [
    'users_module',
    'membership_types_module',
    'memberships_module:app',
    'memberships_module:org',
    'sessions_module',
    'secrets_module',
    'encrypted_secrets_module',
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
    'permissions_module:app',
    'permissions_module:org',
    'limits_module:app',
    'limits_module:org',
    'levels_module:app',
    'levels_module:org',
    'profiles_module:app',
    'profiles_module:org',
    'hierarchy_module:org',
    'invites_module:app',
    'invites_module:org'
  ],
  includes_notes: {
    'memberships_module:org': 'Org-scoped membership rows — every user in an org gets one.',
    'permissions_module:app': 'App-wide permission grants (e.g. platform admins).',
    'permissions_module:org': 'Org-scoped permission grants (per-workspace admins, members, viewers, ...).',
    'limits_module:app': 'App-level quotas (e.g. max users per plan).',
    'limits_module:org': 'Org-level quotas (e.g. per-workspace API call caps).',
    'levels_module:app': 'Role/level bundles at the app scope.',
    'levels_module:org': 'Role/level bundles at the org scope (admin / member / viewer, etc.).',
    'profiles_module:app': 'App-scoped user profile (one per user).',
    'profiles_module:org': 'Org-scoped user profile (per org a user belongs to).',
    'hierarchy_module:org': 'Nested org structures (parent / child orgs).',
    'invites_module:app': 'App-level invites (rare — usually platform admin adds another admin).',
    'invites_module:org': 'Org-level invites (the common case — invite a teammate into a workspace).'
  },
  omits_notes: {
    storage_module: 'Add separately if you need file uploads tied to orgs.',
    crypto_addresses_module: 'Not a web3 preset.'
  },
  extends: ['auth:hardened']
};
