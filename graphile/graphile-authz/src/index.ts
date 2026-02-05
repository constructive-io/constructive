/**
 * @graphile-v5-spike/authz
 *
 * Dynamic PostGraphile v5 authorization plugin based on Authz node types
 * from constructive-db. This package provides a way to add security patches
 * on top of your GraphQL backend by dynamically generating SQL WHERE clauses
 * from Authz node definitions.
 *
 * FEATURES:
 * - TypeScript types for all Authz node payloads (AuthzDirectOwner, AuthzMembership, etc.)
 * - SQL expression generators that convert Authz nodes to WHERE clauses
 * - PostGraphile plugin that applies authorization rules to queries
 * - Configuration system for matching APIs to Authz definitions
 * - Common rule patterns for quick setup
 *
 * USAGE:
 *
 * 1. Create authorization rules:
 * ```typescript
 * import { createAuthzPreset, defineRules, CommonRules } from '@graphile-v5-spike/authz';
 *
 * const authzPreset = createAuthzPreset({
 *   rules: [
 *     CommonRules.adminFullAccess({ membershipType: 'app' }),
 *     CommonRules.ownDataOnly({ table: 'user_profiles', ownerField: 'user_id' }),
 *     CommonRules.orgMemberAccess({ table: 'org_*', entityField: 'org_id' }),
 *   ],
 *   defaultPolicy: 'deny',
 * });
 * ```
 *
 * 2. Add to your PostGraphile preset:
 * ```typescript
 * import { ConstructivePreset } from '@graphile-v5-spike/settings';
 *
 * const preset: GraphileConfig.Preset = {
 *   extends: [ConstructivePreset, authzPreset],
 *   pgServices: [...],
 * };
 * ```
 *
 * 3. Use the SQL generator directly:
 * ```typescript
 * import { generateSql, AuthzSql } from '@graphile-v5-spike/authz';
 *
 * // Generate SQL for a direct owner check
 * const sql = AuthzSql.directOwner('owner_id');
 * // Result: "owner_id" = current_user_id()
 *
 * // Generate SQL for membership check
 * const sql2 = AuthzSql.membershipByField('org_id', { membership_type: 2 });
 * // Result: "org_id" = ANY (SELECT sprt."entity_id" FROM "app_private"."org_memberships_sprt" AS sprt WHERE sprt."actor_id" = current_user_id())
 * ```
 *
 * AUTHZ NODE TYPES:
 * - AuthzDirectOwner: Direct equality check (owner_id = current_user_id())
 * - AuthzDirectOwnerAny: OR logic for multiple ownership fields
 * - AuthzMembership: Membership check without entity binding
 * - AuthzMembershipByField: Membership scoped by field on row
 * - AuthzMembershipByJoin: JOIN-based membership verification
 * - AuthzOrgHierarchy: Organizational hierarchy visibility
 * - AuthzTemporal: Time-window based access control
 * - AuthzPublishable: Published state access control
 * - AuthzArrayContainsActor: User in array column
 * - AuthzArrayContainsActorByJoin: User in array on related table
 * - AuthzAllowAll: Always TRUE
 * - AuthzDenyAll: Always FALSE
 * - AuthzComposite: Boolean combinations (AND/OR/NOT)
 *
 * @see https://github.com/constructive-io/constructive-db/blob/main/docs/spec/node-types.md
 */

// Main plugin exports
export {
  createAuthzPlugin,
  createAuthzPreset,
  defineRule,
  defineRules,
  CommonRules,
  AUTHZ_CONTEXT_KEY,
  type AuthzGraphQLContext,
} from './plugin';

// Type exports
export * from './types/index';

// Evaluator exports
export * from './evaluators/index';
