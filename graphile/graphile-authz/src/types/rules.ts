/**
 * Authorization Rule Configuration Types
 *
 * These types define how to configure authorization rules for tables and operations.
 */

import type { AuthzNode } from './authz-nodes';

/**
 * GraphQL/Database operation types.
 */
export type OperationType = 'select' | 'insert' | 'update' | 'delete';

/**
 * Target specification for an authorization rule.
 * Defines which table(s) and operation(s) the rule applies to.
 */
export interface AuthzRuleTarget {
  /**
   * Schema name pattern (supports wildcards).
   * @example 'public', 'app_*', '*'
   */
  schema?: string;

  /**
   * Table name pattern (supports wildcards).
   * @example 'users', 'user_*', '*'
   */
  table?: string;

  /**
   * Specific operations this rule applies to.
   * If not specified, applies to all operations.
   */
  operations?: OperationType[];

  /**
   * Specific fields this rule applies to (for field-level authorization).
   * If not specified, applies to all fields.
   */
  fields?: string[];
}

/**
 * A complete authorization rule combining target and policy.
 */
export interface AuthzRule {
  /** Unique identifier for this rule */
  id: string;

  /** Human-readable name for this rule */
  name: string;

  /** Description of what this rule does */
  description?: string;

  /** Target specification (which tables/operations) */
  target: AuthzRuleTarget;

  /** The authorization policy to apply */
  policy: AuthzNode;

  /** Priority for rule ordering (higher = evaluated first) */
  priority?: number;

  /** Whether this rule is enabled */
  enabled?: boolean;
}

/**
 * Configuration for the authorization plugin.
 */
export interface AuthzPluginConfig {
  /** List of authorization rules to apply */
  rules: AuthzRule[];

  /**
   * Default policy when no rules match.
   * @default 'deny' - Deny access if no rules match
   */
  defaultPolicy?: 'allow' | 'deny';

  /**
   * How to combine multiple matching rules.
   * @default 'first' - Use the first matching rule (by priority)
   */
  ruleCombination?: 'first' | 'all' | 'any';

  /**
   * Function to extract authorization context from GraphQL context.
   * This is called for each request to get the current user's info.
   */
  contextExtractor?: (graphqlContext: unknown) => Promise<AuthzContextInput>;

  /**
   * Whether to log authorization decisions (for debugging).
   * @default false
   */
  debug?: boolean;
}

/**
 * Input for creating an authorization context from request data.
 */
export interface AuthzContextInput {
  /** Current user's ID */
  userId?: string | null;

  /** User's memberships (simplified format) */
  memberships?: Array<{
    entityId: string;
    membershipType: number | string;
    permissions?: string[] | bigint;
    isAdmin?: boolean;
    isOwner?: boolean;
  }>;

  /** User's hierarchy positions */
  hierarchy?: Array<{
    entityId: string;
    ancestorIds?: string[];
    descendantIds?: string[];
  }>;
}

/**
 * Result of evaluating an authorization rule.
 */
export interface AuthzEvaluationResult {
  /** Whether access is allowed */
  allowed: boolean;

  /** The rule that was applied (if any) */
  appliedRule?: AuthzRule;

  /** SQL expression generated (for debugging) */
  sqlExpression?: string;

  /** Reason for the decision */
  reason?: string;
}

/**
 * Checks if a target matches a given schema/table/operation.
 */
export function targetMatches(
  target: AuthzRuleTarget,
  schema: string,
  table: string,
  operation: OperationType
): boolean {
  // Check schema pattern
  if (target.schema && !patternMatches(target.schema, schema)) {
    return false;
  }

  // Check table pattern
  if (target.table && !patternMatches(target.table, table)) {
    return false;
  }

  // Check operation
  if (target.operations && !target.operations.includes(operation)) {
    return false;
  }

  return true;
}

/**
 * Simple pattern matching with wildcard support.
 */
function patternMatches(pattern: string, value: string): boolean {
  if (pattern === '*') {
    return true;
  }

  if (pattern.includes('*')) {
    // Convert glob pattern to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(value);
  }

  return pattern === value;
}

/**
 * Finds all rules that match a given target.
 */
export function findMatchingRules(
  rules: AuthzRule[],
  schema: string,
  table: string,
  operation: OperationType
): AuthzRule[] {
  return rules
    .filter((rule) => rule.enabled !== false)
    .filter((rule) => targetMatches(rule.target, schema, table, operation))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}
