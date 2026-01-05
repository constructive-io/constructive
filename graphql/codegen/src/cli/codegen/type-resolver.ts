/**
 * Type Resolver - Convert GraphQL types to TypeScript
 * 
 * Utilities for converting CleanTypeRef and other GraphQL types
 * into TypeScript type strings and interface definitions.
 */
import type {
  CleanTypeRef,
  CleanArgument,
  CleanObjectField,
} from '../../types/schema';
import type { InterfaceProperty } from './ts-ast';
import { scalarToTsType as resolveScalarToTs } from './scalars';

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
 */
export function typeRefToTsType(typeRef: CleanTypeRef): string {
  switch (typeRef.kind) {
    case 'NON_NULL':
      // Non-null wrapper - unwrap and return the inner type
      if (typeRef.ofType) {
        return typeRefToTsType(typeRef.ofType);
      }
      return 'unknown';

    case 'LIST':
      // List wrapper - wrap inner type in array
      if (typeRef.ofType) {
        const innerType = typeRefToTsType(typeRef.ofType);
        return `${innerType}[]`;
      }
      return 'unknown[]';

    case 'SCALAR':
      // Scalar type - map to TS type
      return scalarToTsType(typeRef.name ?? 'unknown');

    case 'ENUM':
      // Enum type - use the GraphQL enum name
      return typeRef.name ?? 'string';

    case 'OBJECT':
    case 'INPUT_OBJECT':
      // Object types - use the GraphQL type name
      return typeRef.name ?? 'unknown';

    default:
      return 'unknown';
  }
}

/**
 * Convert a CleanTypeRef to a nullable TypeScript type string
 * (for optional fields that can be null)
 */
export function typeRefToNullableTsType(typeRef: CleanTypeRef): string {
  const baseType = typeRefToTsType(typeRef);

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
// Interface Property Generation
// ============================================================================

/**
 * Convert CleanArgument to InterfaceProperty for ts-morph
 */
export function argumentToInterfaceProperty(arg: CleanArgument): InterfaceProperty {
  return {
    name: arg.name,
    type: typeRefToTsType(arg.type),
    optional: !isTypeRequired(arg.type),
    docs: arg.description ? [arg.description] : undefined,
  };
}

/**
 * Convert CleanObjectField to InterfaceProperty for ts-morph
 */
export function fieldToInterfaceProperty(field: CleanObjectField): InterfaceProperty {
  return {
    name: field.name,
    type: typeRefToNullableTsType(field.type),
    optional: false, // Fields are always present, just potentially null
    docs: field.description ? [field.description] : undefined,
  };
}

/**
 * Convert an array of CleanArguments to InterfaceProperty array
 */
export function argumentsToInterfaceProperties(args: CleanArgument[]): InterfaceProperty[] {
  return args.map(argumentToInterfaceProperty);
}

/**
 * Convert an array of CleanObjectFields to InterfaceProperty array
 */
export function fieldsToInterfaceProperties(fields: CleanObjectField[]): InterfaceProperty[] {
  return fields.map(fieldToInterfaceProperty);
}

// ============================================================================
// Type Filtering
// ============================================================================

/**
 * Check if a field should be skipped in selections
 */
export function shouldSkipField(fieldName: string, skipQueryField: boolean): boolean {
  if (skipQueryField && fieldName === 'query') return true;
  if (fieldName === 'nodeId') return true;
  if (fieldName === '__typename') return true;
  return false;
}

/**
 * Filter fields to only include selectable scalar and object fields
 */
export function getSelectableFields(
  fields: CleanObjectField[] | undefined,
  skipQueryField: boolean,
  maxDepth: number = 2,
  currentDepth: number = 0
): CleanObjectField[] {
  if (!fields || currentDepth >= maxDepth) return [];

  return fields.filter((field) => {
    // Skip internal fields
    if (shouldSkipField(field.name, skipQueryField)) return false;

    // Get base type kind
    const baseKind = getBaseTypeKind(field.type);

    // Include scalars and enums
    if (baseKind === 'SCALAR' || baseKind === 'ENUM') return true;

    // Include objects up to max depth
    if (baseKind === 'OBJECT' && currentDepth < maxDepth - 1) return true;

    return false;
  });
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
  kind: 'query' | 'mutation'
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
  kind: 'query' | 'mutation'
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
  kind: 'query' | 'mutation'
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
  kind: 'query' | 'mutation'
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
  kind: 'query' | 'mutation'
): string {
  return `${operationName}${kind === 'query' ? 'Query' : 'Mutation'}Document`;
}
