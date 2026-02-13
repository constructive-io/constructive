/**
 * Authz Node Type Definitions
 *
 * These types mirror the node_type_registry seed data from constructive-db.
 * They define the JSON payloads for each authorization node type.
 *
 * @see packages/metaschema/deploy/schemas/metaschema_public/tables/node_type_registry/data/seed.sql
 */

/**
 * AuthzDirectOwner - Direct equality comparison between a table column and the current user ID.
 *
 * Expression: {entity_field} = current_user_id()
 *
 * @example
 * { entity_field: 'owner_id' }
 */
export interface AuthzDirectOwnerPayload {
  /** Column name containing the owner user ID (e.g., owner_id) */
  entity_field: string;
}

/**
 * AuthzDirectOwnerAny - OR logic for multiple ownership fields.
 *
 * Expression: {field_1} = current_user_id() OR {field_2} = current_user_id() OR ...
 *
 * @example
 * { entity_fields: ['owner_id', 'created_by'] }
 */
export interface AuthzDirectOwnerAnyPayload {
  /** Array of column names to check for ownership */
  entity_fields: string[];
}

/**
 * AuthzMembership - Membership check without binding to any entity from the row.
 *
 * Expression: EXISTS (SELECT 1 FROM {sprt} WHERE actor_id = current_user_id()
 *             [AND (permissions & {mask}) = {mask}] [AND (is_admin OR is_owner)])
 *
 * @example
 * { membership_type: 1, permission: 'read' }
 * { membership_type: 'app', is_admin: true }
 */
export interface AuthzMembershipPayload {
  /** Scope: 1=app, 2=org, 3=group (or string name resolved via membership_types_module) */
  membership_type: number | string;
  /** Single permission name to check (resolved to bitstring mask) */
  permission?: string;
  /** Multiple permission names to check (ORed together into mask) */
  permissions?: string[];
  /** If true, require is_admin flag */
  is_admin?: boolean;
  /** If true, require is_owner flag */
  is_owner?: boolean;
  /** Boolean logic for combining is_admin and is_owner checks (default: or) */
  admin_owner_logic?: 'or' | 'and';
}

/**
 * AuthzMembershipByField - Membership check scoped by a field on the row.
 *
 * Expression: {entity_field} = ANY (SELECT entity_id FROM {sprt}
 *             WHERE actor_id = current_user_id()
 *             [AND (permissions & {mask}) = {mask}] [AND (is_admin OR/AND is_owner)])
 *
 * @example
 * { entity_field: 'org_id', membership_type: 2 }
 */
export interface AuthzMembershipByFieldPayload {
  /** Column name referencing the entity (e.g., entity_id, org_id) */
  entity_field: string;
  /** Scope: 1=app, 2=org, 3=group (or string name resolved via membership_types_module) */
  membership_type?: number | string;
  /** Single permission name to check (resolved to bitstring mask) */
  permission?: string;
  /** Multiple permission names to check (ORed together into mask) */
  permissions?: string[];
  /** If true, require is_admin flag */
  is_admin?: boolean;
  /** If true, require is_owner flag */
  is_owner?: boolean;
  /** Boolean logic for combining is_admin and is_owner checks (default: or) */
  admin_owner_logic?: 'or' | 'and';
}

/**
 * AuthzMembershipByJoin - JOIN-based membership verification through related tables.
 *
 * Expression: {entity_field} = ANY (SELECT entity_id FROM {sprt}
 *             JOIN {obj_table} ON {sprt}.entity_id = {obj_table}.{obj_field}
 *             WHERE actor_id = current_user_id() [AND ...])
 *
 * @example
 * {
 *   entity_field: 'project_id',
 *   membership_type: 2,
 *   obj_schema: 'public',
 *   obj_table: 'projects',
 *   obj_field: 'org_id'
 * }
 */
export interface AuthzMembershipByJoinPayload {
  /** Column name on protected table referencing the join table */
  entity_field: string;
  /** Scope: 1=app, 2=org, 3=group (or string name resolved via membership_types_module) */
  membership_type?: number | string;
  /** UUID of the join table (alternative to obj_schema/obj_table) */
  obj_table_id?: string;
  /** Schema of the join table (or use obj_table_id) */
  obj_schema?: string;
  /** Name of the join table (or use obj_table_id) */
  obj_table?: string;
  /** UUID of field on join table (alternative to obj_field) */
  obj_field_id?: string;
  /** Field name on join table to match against SPRT entity_id */
  obj_field?: string;
  /** Single permission name to check (resolved to bitstring mask) */
  permission?: string;
  /** Multiple permission names to check (ORed together into mask) */
  permissions?: string[];
  /** If true, require is_admin flag */
  is_admin?: boolean;
  /** If true, require is_owner flag */
  is_owner?: boolean;
  /** Boolean logic for combining is_admin and is_owner checks (default: or) */
  admin_owner_logic?: 'or' | 'and';
}

/**
 * AuthzOrgHierarchy - Organizational hierarchy visibility using closure table.
 *
 * Expression: EXISTS (SELECT 1 FROM {hierarchy_sprt}
 *             WHERE entity_id = {entity_field}
 *             AND ancestor_id = current_user_id()
 *             AND descendant_id = {anchor_field})
 *
 * @example
 * { direction: 'down', anchor_field: 'owner_id' }
 */
export interface AuthzOrgHierarchyPayload {
  /** down=manager sees subordinates, up=subordinate sees managers */
  direction: 'up' | 'down';
  /** Field referencing the org entity (default: entity_id) */
  entity_field?: string;
  /** Field referencing the user (e.g., owner_id) */
  anchor_field: string;
  /** Optional max depth to limit visibility */
  max_depth?: number;
}

/**
 * AuthzTemporal - Time-window based access control.
 *
 * Expression: {valid_from_field} <= now()
 *             [AND ({valid_until_field} IS NULL OR {valid_until_field} > now())]
 *
 * @example
 * { valid_from_field: 'starts_at', valid_until_field: 'ends_at' }
 */
export interface AuthzTemporalPayload {
  /** Column for start time (at least one of valid_from_field or valid_until_field required) */
  valid_from_field?: string;
  /** Column for end time (at least one of valid_from_field or valid_until_field required) */
  valid_until_field?: string;
  /** Include start boundary (default: true) */
  valid_from_inclusive?: boolean;
  /** Include end boundary (default: false) */
  valid_until_inclusive?: boolean;
}

/**
 * AuthzPublishable - Published state access control.
 *
 * Expression: {is_published_field} IS TRUE [AND {published_at_field} <= now()]
 *
 * @example
 * { is_published_field: 'is_published', published_at_field: 'published_at' }
 */
export interface AuthzPublishablePayload {
  /** Boolean field indicating published state (default: is_published) */
  is_published_field?: string;
  /** Timestamp field for publish time (default: published_at) */
  published_at_field?: string;
  /** Require published_at to be non-null and <= now() (default: true) */
  require_published_at?: boolean;
}

/**
 * AuthzArrayContainsActor - Check if current user is in an array column on the same row.
 *
 * Expression: current_user_id() = ANY({array_field})
 *
 * @example
 * { array_field: 'collaborator_ids' }
 */
export interface AuthzArrayContainsActorPayload {
  /** Column name containing the array of user IDs */
  array_field: string;
}

/**
 * AuthzArrayContainsActorByJoin - Array membership check in a related table.
 *
 * Expression: (SELECT current_user_id() = ANY({owned_table_key})
 *             FROM {owned_schema}.{owned_table}
 *             WHERE {owned_table_ref_key} = {this_object_key})
 *
 * @example
 * {
 *   owned_schema: 'public',
 *   owned_table: 'project_members',
 *   owned_table_key: 'member_ids',
 *   owned_table_ref_key: 'project_id',
 *   this_object_key: 'id'
 * }
 */
export interface AuthzArrayContainsActorByJoinPayload {
  /** Schema of the related table */
  owned_schema: string;
  /** Name of the related table */
  owned_table: string;
  /** Array column in related table */
  owned_table_key: string;
  /** FK column in related table */
  owned_table_ref_key: string;
  /** PK column in protected table */
  this_object_key: string;
}

/**
 * AuthzAllowAll - Allows all access.
 *
 * Expression: TRUE
 */
export interface AuthzAllowAllPayload {
  // No parameters needed
}

/**
 * AuthzDenyAll - Denies all access.
 *
 * Expression: FALSE
 */
export interface AuthzDenyAllPayload {
  // No parameters needed
}

/**
 * Boolean expression operators for composite policies.
 */
export type BoolOp = 'AND_EXPR' | 'OR_EXPR' | 'NOT_EXPR';

/**
 * AuthzComposite - Composite authorization policy combining multiple nodes.
 *
 * Expression: ({node_1}) AND/OR ({node_2}) ...
 *
 * @example
 * {
 *   BoolExpr: {
 *     boolop: 'OR_EXPR',
 *     args: [
 *       { AuthzDirectOwner: { entity_field: 'owner_id' } },
 *       { AuthzMembership: { membership_type: 1, is_admin: true } }
 *     ]
 *   }
 * }
 */
export interface AuthzCompositePayload {
  BoolExpr: {
    /** Boolean operator: AND_EXPR, OR_EXPR, or NOT_EXPR */
    boolop: BoolOp;
    /** Array of authorization nodes to combine */
    args: AuthzNode[];
  };
}

/**
 * All possible Authz node types.
 */
export type AuthzNodeType =
  | 'AuthzDirectOwner'
  | 'AuthzDirectOwnerAny'
  | 'AuthzMembership'
  | 'AuthzMembershipByField'
  | 'AuthzMembershipByJoin'
  | 'AuthzOrgHierarchy'
  | 'AuthzTemporal'
  | 'AuthzPublishable'
  | 'AuthzArrayContainsActor'
  | 'AuthzArrayContainsActorByJoin'
  | 'AuthzAllowAll'
  | 'AuthzDenyAll'
  | 'AuthzComposite';

/**
 * Map of node types to their payload types.
 */
export interface AuthzNodePayloadMap {
  AuthzDirectOwner: AuthzDirectOwnerPayload;
  AuthzDirectOwnerAny: AuthzDirectOwnerAnyPayload;
  AuthzMembership: AuthzMembershipPayload;
  AuthzMembershipByField: AuthzMembershipByFieldPayload;
  AuthzMembershipByJoin: AuthzMembershipByJoinPayload;
  AuthzOrgHierarchy: AuthzOrgHierarchyPayload;
  AuthzTemporal: AuthzTemporalPayload;
  AuthzPublishable: AuthzPublishablePayload;
  AuthzArrayContainsActor: AuthzArrayContainsActorPayload;
  AuthzArrayContainsActorByJoin: AuthzArrayContainsActorByJoinPayload;
  AuthzAllowAll: AuthzAllowAllPayload;
  AuthzDenyAll: AuthzDenyAllPayload;
  AuthzComposite: AuthzCompositePayload;
}

/**
 * Union type for all Authz node structures.
 * Each node is an object with a single key (the node type) and its payload.
 */
export type AuthzNode =
  | { AuthzDirectOwner: AuthzDirectOwnerPayload }
  | { AuthzDirectOwnerAny: AuthzDirectOwnerAnyPayload }
  | { AuthzMembership: AuthzMembershipPayload }
  | { AuthzMembershipByField: AuthzMembershipByFieldPayload }
  | { AuthzMembershipByJoin: AuthzMembershipByJoinPayload }
  | { AuthzOrgHierarchy: AuthzOrgHierarchyPayload }
  | { AuthzTemporal: AuthzTemporalPayload }
  | { AuthzPublishable: AuthzPublishablePayload }
  | { AuthzArrayContainsActor: AuthzArrayContainsActorPayload }
  | { AuthzArrayContainsActorByJoin: AuthzArrayContainsActorByJoinPayload }
  | { AuthzAllowAll: AuthzAllowAllPayload }
  | { AuthzDenyAll: AuthzDenyAllPayload }
  | { AuthzComposite: AuthzCompositePayload };

/**
 * Helper type to extract the node type from an AuthzNode.
 */
export type ExtractNodeType<T extends AuthzNode> = keyof T & AuthzNodeType;

/**
 * Helper function to get the node type from an AuthzNode.
 */
export function getNodeType(node: AuthzNode): AuthzNodeType {
  return Object.keys(node)[0] as AuthzNodeType;
}

/**
 * Helper function to get the payload from an AuthzNode.
 */
export function getNodePayload<T extends AuthzNodeType>(
  node: AuthzNode,
  expectedType?: T
): AuthzNodePayloadMap[T] | undefined {
  const type = getNodeType(node);
  if (expectedType && type !== expectedType) {
    return undefined;
  }
  return (node as Record<string, unknown>)[type] as AuthzNodePayloadMap[T];
}
