import type { PrincipalPreset } from './types';

/**
 * Principal presets: blueprints a human instantiates in one call.
 *
 * Both rows name capabilities rather than bit positions. A principal's SPRT is
 * `owner_rows & preset_mask`, and the mask is resolved against the tenant's
 * own capabilities table when the row is instantiated, so the same catalog row
 * fits a tenant with 64 bits and a tenant with 256 without granting a bit
 * either does not know. A name the tenant lacks is an error, never a silently
 * narrower principal.
 *
 * The lifetimes are ceilings the tenant's `auth_settings` may lower but a
 * preset may never raise; a tenant whose settings are tighter than the row
 * rejects the instantiation rather than quietly widening.
 */

/**
 * Reads everything the owner can read, writes nothing. The mask at each scope
 * is null — every bit the owner holds, so a capability-gated read the owner
 * has is one the analyst has — and `is_read_only` is what forbids the writes.
 * No delegation: an analyst does not mint agents.
 */
export const readOnlyAnalyst: PrincipalPreset = {
  kind: 'principal',
  slug: 'read-only-analyst',
  label: 'Read-only analyst',
  description:
    'Sees what its owner sees and changes nothing: read-only at every scope, all of the owner\'s bits, no delegation.',
  definition: {
    is_read_only: true,
    use_admin_owner: false,
    bypass_step_up: false,
    scopes: [
      { membership_type: 'app', allowed_mask_capabilities: null },
      { membership_type: 'org', allowed_mask_capabilities: null }
    ],
    entity_policy: 'inherit_owner',
    delegation: { allowed: false, max_depth: 0 },
    credentials: {
      api_key_ttl: '30 days',
      access_token_ttl: '15 minutes',
      refresh_token_ttl: '7 days',
      max_chain_age: '30 days'
    }
  }
};

/**
 * Ships code: the organization capabilities that move services, sites, and
 * domains, and nothing else — no member administration, no secrets, no
 * exports. `require_list` pins it to the organizations it deploys for, and it
 * may mint exactly one level of child (a per-job worker) beneath itself.
 * `bypass_step_up` lets an unattended pipeline past the MFA guards its owner
 * would otherwise have to satisfy in person — so instantiating this preset is
 * itself MFA-gated: the principals INSERT guard demands a fresh MFA proof from
 * the human caller (a password re-entry is not enough) before a
 * `bypass_step_up` principal may come into existence. Narrowing the preset
 * with `bypass_step_up: false` lifts that requirement.
 */
export const deployBot: PrincipalPreset = {
  kind: 'principal',
  slug: 'deploy-bot',
  label: 'Deploy bot',
  description:
    'Manages services, sites, and domains for the organizations it is scoped to; nothing else. Unattended: bypasses step-up, may delegate one level. Creating one requires a fresh MFA proof.',
  definition: {
    is_read_only: false,
    use_admin_owner: false,
    bypass_step_up: true,
    scopes: [
      { membership_type: 'app', allowed_mask_capabilities: [] },
      {
        membership_type: 'org',
        allowed_mask_capabilities: ['manage_services', 'manage_sites', 'manage_domains']
      }
    ],
    entity_policy: 'require_list',
    delegation: { allowed: true, max_depth: 1 },
    credentials: {
      api_key_ttl: '30 days',
      access_token_ttl: '15 minutes',
      refresh_token_ttl: '7 days',
      max_chain_age: '30 days'
    }
  }
};
