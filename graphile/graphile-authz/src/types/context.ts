/**
 * Authorization Context Types
 *
 * These types define the context information needed to evaluate authorization rules.
 * The context is typically populated from the current user's session/JWT.
 */

/**
 * Membership entry representing a user's membership in an entity.
 */
export interface MembershipEntry {
  /** The entity ID (app, org, or group ID) */
  entity_id: string;
  /** Membership type: 1=app, 2=org, 3=group */
  membership_type: number;
  /** Bitstring permissions (as a number or bigint for bitwise operations) */
  permissions: bigint;
  /** Whether the user is an admin of this entity */
  is_admin: boolean;
  /** Whether the user is an owner of this entity */
  is_owner: boolean;
}

/**
 * Hierarchy entry representing a user's position in an org hierarchy.
 */
export interface HierarchyEntry {
  /** The org/entity ID */
  entity_id: string;
  /** User IDs that are ancestors (managers) of the current user */
  ancestor_ids: string[];
  /** User IDs that are descendants (subordinates) of the current user */
  descendant_ids: string[];
  /** Depth in the hierarchy (0 = root) */
  depth: number;
}

/**
 * Permission definition for resolving permission names to bit positions.
 */
export interface PermissionDefinition {
  /** Permission name (e.g., 'read', 'write', 'admin') */
  name: string;
  /** Bit position in the permissions bitstring */
  bit_position: number;
}

/**
 * Membership type definition for resolving type names to IDs.
 */
export interface MembershipTypeDefinition {
  /** Type name (e.g., 'app', 'org', 'group') */
  name: string;
  /** Type ID (1, 2, 3, etc.) */
  id: number;
}

/**
 * Authorization context containing all information needed to evaluate rules.
 */
export interface AuthzContext {
  /** Current user's ID (null if not authenticated) */
  current_user_id: string | null;

  /** User's memberships (from SPRT or session) */
  memberships: MembershipEntry[];

  /** User's hierarchy positions (for org hierarchy checks) */
  hierarchy: HierarchyEntry[];

  /** Permission definitions for resolving names to bit positions */
  permission_definitions: PermissionDefinition[];

  /** Membership type definitions for resolving names to IDs */
  membership_type_definitions: MembershipTypeDefinition[];

  /** Current timestamp for temporal checks (defaults to now) */
  current_time?: Date;
}

/**
 * Default membership type definitions matching constructive-db conventions.
 */
export const DEFAULT_MEMBERSHIP_TYPES: MembershipTypeDefinition[] = [
  { name: 'app', id: 1 },
  { name: 'org', id: 2 },
  { name: 'group', id: 3 },
];

/**
 * Creates an empty authorization context (for unauthenticated users).
 */
export function createEmptyContext(): AuthzContext {
  return {
    current_user_id: null,
    memberships: [],
    hierarchy: [],
    permission_definitions: [],
    membership_type_definitions: DEFAULT_MEMBERSHIP_TYPES,
  };
}

/**
 * Creates an authorization context for an authenticated user.
 */
export function createAuthzContext(
  userId: string,
  options: Partial<Omit<AuthzContext, 'current_user_id'>> = {}
): AuthzContext {
  return {
    current_user_id: userId,
    memberships: options.memberships ?? [],
    hierarchy: options.hierarchy ?? [],
    permission_definitions: options.permission_definitions ?? [],
    membership_type_definitions:
      options.membership_type_definitions ?? DEFAULT_MEMBERSHIP_TYPES,
    current_time: options.current_time,
  };
}

/**
 * Resolves a membership type name or ID to a numeric ID.
 */
export function resolveMembershipType(
  typeOrName: number | string,
  definitions: MembershipTypeDefinition[]
): number | null {
  if (typeof typeOrName === 'number') {
    return typeOrName;
  }
  const def = definitions.find(
    (d) => d.name.toLowerCase() === typeOrName.toLowerCase()
  );
  return def?.id ?? null;
}

/**
 * Resolves permission names to a combined bitstring mask.
 */
export function resolvePermissionMask(
  permissions: string[],
  definitions: PermissionDefinition[]
): bigint {
  let mask = 0n;
  for (const perm of permissions) {
    const def = definitions.find(
      (d) => d.name.toLowerCase() === perm.toLowerCase()
    );
    if (def) {
      mask |= 1n << BigInt(def.bit_position);
    }
  }
  return mask;
}
