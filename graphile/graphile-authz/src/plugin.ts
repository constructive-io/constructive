/**
 * PostGraphile v5 Authorization Plugin
 *
 * This plugin dynamically applies authorization rules to GraphQL operations
 * based on Authz node definitions from constructive-db. It generates SQL
 * WHERE clauses that are injected into queries to enforce authorization
 * at the database level.
 *
 * ARCHITECTURE:
 * 1. Rules are configured with targets (schema/table/operation patterns)
 * 2. When a query/mutation is executed, matching rules are found
 * 3. SQL expressions are generated from the Authz node definitions
 * 4. The SQL is injected as additional WHERE conditions
 *
 * This approach leverages PostgreSQL's query planner for optimal performance
 * and ensures authorization is enforced consistently at the data layer.
 */

import type { GraphileConfig } from 'graphile-config';
// Import graphile-build to get the schema type extensions
import 'graphile-build';
import type {
  AuthzRule,
  AuthzPluginConfig,
  OperationType,
  AuthzContextInput,
} from './types/rules';
import type { AuthzNode } from './types/authz-nodes';
import {
  generateSql,
  type SqlGeneratorOptions,
  type SqlGeneratorResult,
} from './evaluators/sql-generator';
import { findMatchingRules } from './types/rules';

/**
 * Symbol for storing authz context in GraphQL context.
 */
export const AUTHZ_CONTEXT_KEY = Symbol('authz-context');

/**
 * Extended GraphQL context with authorization information.
 */
export interface AuthzGraphQLContext {
  [AUTHZ_CONTEXT_KEY]?: {
    userId?: string | null;
    memberships?: AuthzContextInput['memberships'];
    hierarchy?: AuthzContextInput['hierarchy'];
  };
}

/**
 * Creates the authorization plugin with the given configuration.
 *
 * @param config - Authorization plugin configuration
 * @returns GraphileConfig.Plugin
 *
 * @example
 * ```typescript
 * import { createAuthzPlugin } from '@graphile-v5-spike/authz';
 *
 * const authzPlugin = createAuthzPlugin({
 *   rules: [
 *     {
 *       id: 'users-own-data',
 *       name: 'Users can only see their own data',
 *       target: { schema: 'public', table: 'user_profiles', operations: ['select'] },
 *       policy: { AuthzDirectOwner: { entity_field: 'user_id' } },
 *     },
 *     {
 *       id: 'org-members-access',
 *       name: 'Org members can access org data',
 *       target: { schema: 'public', table: 'org_*', operations: ['select'] },
 *       policy: { AuthzMembershipByField: { entity_field: 'org_id', membership_type: 2 } },
 *     },
 *   ],
 *   defaultPolicy: 'deny',
 * });
 * ```
 */
export function createAuthzPlugin(
  config: AuthzPluginConfig
): GraphileConfig.Plugin {
  const {
    rules,
    defaultPolicy = 'deny',
    ruleCombination = 'first',
    debug = false,
  } = config;

  return {
    name: 'AuthzPlugin',
    version: '1.0.0',
    description:
      'Dynamic authorization plugin based on Authz node types from constructive-db',

    schema: {
      hooks: {
        /**
         * Hook into the build phase to add authorization utilities.
         */
        build(build) {
          // Add authorization utilities to the build object
          return build.extend(
            build,
            {
              authz: {
              rules,
              defaultPolicy,
              ruleCombination,
              debug,

              /**
               * Find matching rules for a given target.
               */
              findRules(
                schema: string,
                table: string,
                operation: OperationType
              ): AuthzRule[] {
                return findMatchingRules(rules, schema, table, operation);
              },

              /**
               * Generate SQL for a given Authz node.
               */
              generateSql(
                node: AuthzNode,
                options?: SqlGeneratorOptions
              ): SqlGeneratorResult {
                return generateSql(node, options);
              },

              /**
               * Generate combined SQL for all matching rules.
               */
              generateAuthzSql(
                schema: string,
                table: string,
                operation: OperationType,
                options?: SqlGeneratorOptions
              ): SqlGeneratorResult | null {
                const matchingRules = findMatchingRules(
                  rules,
                  schema,
                  table,
                  operation
                );

                if (matchingRules.length === 0) {
                  // No rules match - apply default policy
                  if (defaultPolicy === 'allow') {
                    return { sql: 'TRUE', isAlwaysTrue: true };
                  }
                  return { sql: 'FALSE', isAlwaysFalse: true };
                }

                if (ruleCombination === 'first') {
                  // Use only the first (highest priority) rule
                  const rule = matchingRules[0];
                  if (debug) {
                    console.log(
                      `[Authz] Applying rule "${rule.name}" to ${schema}.${table} (${operation})`
                    );
                  }
                  return generateSql(rule.policy, options);
                }

                // Combine multiple rules
                const results = matchingRules.map((rule) => {
                  if (debug) {
                    console.log(
                      `[Authz] Applying rule "${rule.name}" to ${schema}.${table} (${operation})`
                    );
                  }
                  return generateSql(rule.policy, options);
                });

                // Filter out always-true/false based on combination mode
                if (ruleCombination === 'all') {
                  // AND logic
                  if (results.some((r) => r.isAlwaysFalse)) {
                    return { sql: 'FALSE', isAlwaysFalse: true };
                  }
                  const filtered = results.filter((r) => !r.isAlwaysTrue);
                  if (filtered.length === 0) {
                    return { sql: 'TRUE', isAlwaysTrue: true };
                  }
                  if (filtered.length === 1) {
                    return filtered[0];
                  }
                  return { sql: `(${filtered.map((r) => r.sql).join(' AND ')})` };
                } else {
                  // OR logic (any)
                  if (results.some((r) => r.isAlwaysTrue)) {
                    return { sql: 'TRUE', isAlwaysTrue: true };
                  }
                  const filtered = results.filter((r) => !r.isAlwaysFalse);
                  if (filtered.length === 0) {
                    return { sql: 'FALSE', isAlwaysFalse: true };
                  }
                  if (filtered.length === 1) {
                    return filtered[0];
                  }
                  return { sql: `(${filtered.map((r) => r.sql).join(' OR ')})` };
                }
              },
              },
            },
            'AuthzPlugin'
          );
        },
      },
    },
  };
}

/**
 * Preset that includes the authorization plugin.
 * Use this in your main preset's `extends` array.
 *
 * @param config - Authorization plugin configuration
 * @returns GraphileConfig.Preset
 *
 * @example
 * ```typescript
 * import { createAuthzPreset } from '@graphile-v5-spike/authz';
 *
 * const preset: GraphileConfig.Preset = {
 *   extends: [
 *     ConstructivePreset,
 *     createAuthzPreset({
 *       rules: [...],
 *     }),
 *   ],
 * };
 * ```
 */
export function createAuthzPreset(
  config: AuthzPluginConfig
): GraphileConfig.Preset {
  return {
    plugins: [createAuthzPlugin(config)],
  };
}

/**
 * Helper to create authorization rules with type safety.
 */
export function defineRule(rule: AuthzRule): AuthzRule {
  return rule;
}

/**
 * Helper to create multiple authorization rules.
 */
export function defineRules(rules: AuthzRule[]): AuthzRule[] {
  return rules;
}

/**
 * Common rule patterns for quick setup.
 */
export const CommonRules = {
  /**
   * Users can only access their own data (by owner_id field).
   */
  ownDataOnly(
    options: {
      schema?: string;
      table?: string;
      ownerField?: string;
      operations?: OperationType[];
    } = {}
  ): AuthzRule {
    return {
      id: 'own-data-only',
      name: 'Users can only access their own data',
      target: {
        schema: options.schema ?? '*',
        table: options.table ?? '*',
        operations: options.operations,
      },
      policy: {
        AuthzDirectOwner: {
          entity_field: options.ownerField ?? 'owner_id',
        },
      },
    };
  },

  /**
   * Org members can access org-scoped data.
   */
  orgMemberAccess(
    options: {
      schema?: string;
      table?: string;
      entityField?: string;
      operations?: OperationType[];
      permission?: string;
    } = {}
  ): AuthzRule {
    return {
      id: 'org-member-access',
      name: 'Org members can access org data',
      target: {
        schema: options.schema ?? '*',
        table: options.table ?? '*',
        operations: options.operations,
      },
      policy: {
        AuthzMembershipByField: {
          entity_field: options.entityField ?? 'org_id',
          membership_type: 2,
          permission: options.permission,
        },
      },
    };
  },

  /**
   * Only published content is visible.
   */
  publishedOnly(
    options: {
      schema?: string;
      table?: string;
      isPublishedField?: string;
      publishedAtField?: string;
    } = {}
  ): AuthzRule {
    return {
      id: 'published-only',
      name: 'Only published content is visible',
      target: {
        schema: options.schema ?? '*',
        table: options.table ?? '*',
        operations: ['select'],
      },
      policy: {
        AuthzPublishable: {
          is_published_field: options.isPublishedField,
          published_at_field: options.publishedAtField,
        },
      },
    };
  },

  /**
   * Admins have full access.
   */
  adminFullAccess(
    options: {
      schema?: string;
      table?: string;
      membershipType?: number | string;
    } = {}
  ): AuthzRule {
    return {
      id: 'admin-full-access',
      name: 'Admins have full access',
      target: {
        schema: options.schema ?? '*',
        table: options.table ?? '*',
      },
      policy: {
        AuthzMembership: {
          membership_type: options.membershipType ?? 1,
          is_admin: true,
        },
      },
      priority: 100, // High priority so it's checked first
    };
  },

  /**
   * Deny all access (useful as a fallback).
   */
  denyAll(
    options: {
      schema?: string;
      table?: string;
      operations?: OperationType[];
    } = {}
  ): AuthzRule {
    return {
      id: 'deny-all',
      name: 'Deny all access',
      target: {
        schema: options.schema ?? '*',
        table: options.table ?? '*',
        operations: options.operations,
      },
      policy: { AuthzDenyAll: {} },
      priority: -100, // Low priority so it's checked last
    };
  },

  /**
   * Allow all access (useful for public data).
   */
  allowAll(
    options: {
      schema?: string;
      table?: string;
      operations?: OperationType[];
    } = {}
  ): AuthzRule {
    return {
      id: 'allow-all',
      name: 'Allow all access',
      target: {
        schema: options.schema ?? '*',
        table: options.table ?? '*',
        operations: options.operations,
      },
      policy: { AuthzAllowAll: {} },
    };
  },
};
