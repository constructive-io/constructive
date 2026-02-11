/**
 * Type Resolver - Convert GraphQL types to TypeScript
 *
 * Utilities for converting CleanTypeRef and other GraphQL types
 * into TypeScript type strings and interface definitions.
 */
import type { CleanTypeRef } from '../../types/schema';
import { SCALAR_NAMES, scalarToTsType as resolveScalarToTs } from './scalars';

// ============================================================================
// Type Tracker for Collecting Referenced Types
// ============================================================================

/**
 * Types that should not be tracked (scalars, built-ins, internal types)
 */
const SKIP_TYPE_TRACKING = new Set([
  ...SCALAR_NAMES,
  // GraphQL built-ins
  'Query',
  'Mutation',
  'Subscription',
  '__Schema',
  '__Type',
  '__Field',
  '__InputValue',
  '__EnumValue',
  '__Directive',
  // Connection types (handled separately)
  'PageInfo',
]);

/**
 * Interface for tracking referenced types during code generation
 */
export interface TypeTracker {
  /** Set of type names that have been referenced */
  referencedTypes: Set<string>;
  /** Track a type reference */
  track(typeName: string): void;
  /** Get importable types from schema-types.ts (Input/Payload/Enum types) */
  getImportableTypes(): string[];
  /** Get importable types from types.ts (table entity types) */
  getTableTypes(): string[];
  /** Reset the tracker */
  reset(): void;
}

/**
 * Options for creating a TypeTracker
 */
export interface TypeTrackerOptions {
  /** Table entity type names that should be imported from types.ts */
  tableTypeNames?: Set<string>;
}

/**
 * Create a new TypeTracker instance
 *
 * @param options - Optional configuration for the tracker
 */
export function createTypeTracker(options?: TypeTrackerOptions): TypeTracker {
  const referencedTypes = new Set<string>();
  const tableTypeNames = options?.tableTypeNames ?? new Set<string>();

  return {
    referencedTypes,
    track(typeName: string) {
      if (typeName && !SKIP_TYPE_TRACKING.has(typeName)) {
        referencedTypes.add(typeName);
      }
    },
    getImportableTypes() {
      // Return schema types (not table entity types)
      return Array.from(referencedTypes)
        .filter((name) => !tableTypeNames.has(name))
        .sort();
    },
    getTableTypes() {
      // Return table entity types only
      return Array.from(referencedTypes)
        .filter((name) => tableTypeNames.has(name))
        .sort();
    },
    reset() {
      referencedTypes.clear();
    },
  };
}

// ============================================================================
// GraphQL to TypeScript Type Mapping
// ============================================================================

/**
 * Convert a GraphQL scalar type to TypeScript type
 */
export function scalarToTsType(scalarName: string): string {
  return resolveScalarToTs(scalarName, { unknownScalar: 'unknown' });
}

// ============================================================================
// CleanTypeRef to TypeScript
// ============================================================================

/**
 * Convert a CleanTypeRef to a TypeScript type string
 * Handles nested LIST and NON_NULL wrappers
 *
 * @param typeRef - The GraphQL type reference
 * @param tracker - Optional TypeTracker to collect referenced types
 */
export function typeRefToTsType(
  typeRef: CleanTypeRef,
  tracker?: TypeTracker,
): string {
  switch (typeRef.kind) {
    case 'NON_NULL':
      // Non-null wrapper - unwrap and return the inner type
      if (typeRef.ofType) {
        return typeRefToTsType(typeRef.ofType, tracker);
      }
      return 'unknown';

    case 'LIST':
      // List wrapper - wrap inner type in array
      if (typeRef.ofType) {
        const innerType = typeRefToTsType(typeRef.ofType, tracker);
        return `${innerType}[]`;
      }
      return 'unknown[]';

    case 'SCALAR':
      // Scalar type - map to TS type
      return scalarToTsType(typeRef.name ?? 'unknown');

    case 'ENUM': {
      // Enum type - use the GraphQL enum name and track it
      const typeName = typeRef.name ?? 'string';
      tracker?.track(typeName);
      return typeName;
    }

    case 'OBJECT':
    case 'INPUT_OBJECT': {
      // Object types - use the GraphQL type name and track it
      const typeName = typeRef.name ?? 'unknown';
      tracker?.track(typeName);
      return typeName;
    }

    default:
      return 'unknown';
  }
}

/**
 * Convert a CleanTypeRef to a nullable TypeScript type string
 * (for optional fields that can be null)
 *
 * @param typeRef - The GraphQL type reference
 * @param tracker - Optional TypeTracker to collect referenced types
 */
export function typeRefToNullableTsType(
  typeRef: CleanTypeRef,
  tracker?: TypeTracker,
): string {
  const baseType = typeRefToTsType(typeRef, tracker);

  // If the outer type is NON_NULL, it's required
  if (typeRef.kind === 'NON_NULL') {
    return baseType;
  }

  // Otherwise, it can be null
  return `${baseType} | null`;
}

/**
 * Check if a type reference is required (wrapped in NON_NULL)
 */
export function isTypeRequired(typeRef: CleanTypeRef): boolean {
  return typeRef.kind === 'NON_NULL';
}

/**
 * Check if a type reference is a list
 */
export function isTypeList(typeRef: CleanTypeRef): boolean {
  if (typeRef.kind === 'LIST') return true;
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return typeRef.ofType.kind === 'LIST';
  }
  return false;
}

/**
 * Get the base type name from a type reference (unwrapping wrappers)
 */
export function getTypeBaseName(typeRef: CleanTypeRef): string | null {
  if (typeRef.name) return typeRef.name;
  if (typeRef.ofType) return getTypeBaseName(typeRef.ofType);
  return null;
}

/**
 * Get the base type kind (unwrapping LIST and NON_NULL)
 */
export function getBaseTypeKind(typeRef: CleanTypeRef): CleanTypeRef['kind'] {
  if (typeRef.kind === 'LIST' || typeRef.kind === 'NON_NULL') {
    if (typeRef.ofType) {
      return getBaseTypeKind(typeRef.ofType);
    }
  }
  return typeRef.kind;
}

// ============================================================================
// Type Filtering
// ============================================================================

/**
 * Check if a field should be skipped in selections
 */
export function shouldSkipField(
  fieldName: string,
  skipQueryField: boolean,
): boolean {
  if (skipQueryField && fieldName === 'query') return true;
  if (fieldName === 'nodeId') return true;
  if (fieldName === '__typename') return true;
  return false;
}

// ============================================================================
// Type Name Utilities
// ============================================================================

/**
 * Convert operation name to PascalCase for type names
 */
export function operationNameToPascal(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Generate variables type name for an operation
 * e.g., "login" -> "LoginMutationVariables"
 */
export function getOperationVariablesTypeName(
  operationName: string,
  kind: 'query' | 'mutation',
): string {
  const pascal = operationNameToPascal(operationName);
  return `${pascal}${kind === 'query' ? 'Query' : 'Mutation'}Variables`;
}

/**
 * Generate result type name for an operation
 * e.g., "login" -> "LoginMutationResult"
 */
export function getOperationResultTypeName(
  operationName: string,
  kind: 'query' | 'mutation',
): string {
  const pascal = operationNameToPascal(operationName);
  return `${pascal}${kind === 'query' ? 'Query' : 'Mutation'}Result`;
}

/**
 * Generate hook name for an operation
 * e.g., "login" -> "useLoginMutation", "currentUser" -> "useCurrentUserQuery"
 */
export function getOperationHookName(
  operationName: string,
  kind: 'query' | 'mutation',
): string {
  const pascal = operationNameToPascal(operationName);
  return `use${pascal}${kind === 'query' ? 'Query' : 'Mutation'}`;
}

/**
 * Generate file name for an operation hook
 * e.g., "login" -> "useLoginMutation.ts"
 */
export function getOperationFileName(
  operationName: string,
  kind: 'query' | 'mutation',
): string {
  return `${getOperationHookName(operationName, kind)}.ts`;
}

/**
 * Generate query key factory name
 * e.g., "currentUser" -> "currentUserQueryKey"
 */
export function getQueryKeyName(operationName: string): string {
  return `${operationName}QueryKey`;
}

/**
 * Generate GraphQL document constant name
 * e.g., "login" -> "loginMutationDocument"
 */
export function getDocumentConstName(
  operationName: string,
  kind: 'query' | 'mutation',
): string {
  return `${operationName}${kind === 'query' ? 'Query' : 'Mutation'}Document`;
}
