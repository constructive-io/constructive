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
    'org membership scopes. You get: memberships at org scope, permissions at app and org ' +
    'scopes for fine-grained RBAC, limits at app and org scopes for per-scope quota ' +
    'enforcement, levels at app and org scopes for role bundles, profiles at app and org ' +
    'scopes for per-scope user display info, hierarchy at org scope for nested org structures, ' +
    'and invites at app and org scopes for invite flows. Choose this when the app has ' +
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
    ['memberships_module', { scope: 'app' }],
    ['memberships_module', { scope: 'org' }],
    'sessions_module',
    'user_state_module',
    'user_credentials_module',
    'internal_secrets_module',
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
    ['permissions_module', { scope: 'app' }],
    ['permissions_module', { scope: 'org' }],
    ['limits_module', { scope: 'app' }],
    ['limits_module', { scope: 'org' }],
    ['levels_module', { scope: 'app' }],
    ['levels_module', { scope: 'org' }],
    ['profiles_module', { scope: 'app' }],
    ['profiles_module', { scope: 'org' }],
    ['hierarchy_module', { scope: 'org' }],
    ['invites_module', { scope: 'app' }],
    ['invites_module', { scope: 'org' }],
    'devices_module'
  ],
  extends: ['auth:hardened']
};
