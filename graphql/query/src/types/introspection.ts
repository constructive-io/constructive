/**
 * GraphQL Introspection Types
 *
 * Standard types for GraphQL schema introspection via __schema query.
 * These mirror the GraphQL introspection spec.
 */

// ============================================================================
// Type Reference (recursive)
// ============================================================================

/**
 * Reference to a GraphQL type - can be nested for wrappers like NON_NULL and LIST
 */
export interface IntrospectionTypeRef {
  kind: IntrospectionTypeKind;
  name: string | null;
  ofType: IntrospectionTypeRef | null;
}

export type IntrospectionTypeKind =
  | 'SCALAR'
  | 'OBJECT'
  | 'INPUT_OBJECT'
  | 'ENUM'
  | 'LIST'
  | 'NON_NULL'
  | 'INTERFACE'
  | 'UNION';

// ============================================================================
// Input Values (arguments and input fields)
// ============================================================================

/**
 * Input value - used for both field arguments and INPUT_OBJECT fields
 */
export interface IntrospectionInputValue {
  name: string;
  description: string | null;
  type: IntrospectionTypeRef;
  defaultValue: string | null;
}

// ============================================================================
// Fields
// ============================================================================

/**
 * Field on an OBJECT or INTERFACE type
 */
export interface IntrospectionField {
  name: string;
  description: string | null;
  args: IntrospectionInputValue[];
  type: IntrospectionTypeRef;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

// ============================================================================
// Enum Values
// ============================================================================

/**
 * Enum value definition
 */
export interface IntrospectionEnumValue {
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

// ============================================================================
// Full Type Definition
// ============================================================================

/**
 * Complete type definition from introspection
 */
export interface IntrospectionType {
  kind: IntrospectionTypeKind;
  name: string;
  description: string | null;
  /** Fields for OBJECT and INTERFACE types */
  fields: IntrospectionField[] | null;
  /** Input fields for INPUT_OBJECT types */
  inputFields: IntrospectionInputValue[] | null;
  /** Possible types for INTERFACE and UNION types */
  possibleTypes: Array<{ name: string }> | null;
  /** Enum values for ENUM types */
  enumValues: IntrospectionEnumValue[] | null;
  /** Interfaces implemented by OBJECT types */
  interfaces: Array<{ name: string }> | null;
}

// ============================================================================
// Schema
// ============================================================================

/**
 * Root type references in schema
 */
export interface IntrospectionRootType {
  name: string;
}

/**
 * Full schema introspection result
 */
export interface IntrospectionSchema {
  queryType: IntrospectionRootType;
  mutationType: IntrospectionRootType | null;
  subscriptionType: IntrospectionRootType | null;
  types: IntrospectionType[];
  directives: IntrospectionDirective[];
}

/**
 * Directive definition
 */
export interface IntrospectionDirective {
  name: string;
  description: string | null;
  locations: string[];
  args: IntrospectionInputValue[];
}

// ============================================================================
// Query Response
// ============================================================================

/**
 * Response from introspection query
 */
export interface IntrospectionQueryResponse {
  __schema: IntrospectionSchema;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if type kind is a wrapper (LIST or NON_NULL)
 */
export function isWrapperType(kind: IntrospectionTypeKind): boolean {
  return kind === 'LIST' || kind === 'NON_NULL';
}

/**
 * Check if type kind is a named type (has a name)
 */
export function isNamedType(kind: IntrospectionTypeKind): boolean {
  return !isWrapperType(kind);
}

/**
 * Unwrap a type reference to get the base named type
 */
export function unwrapType(
  typeRef: IntrospectionTypeRef,
): IntrospectionTypeRef {
  let current = typeRef;
  while (current.ofType) {
    current = current.ofType;
  }
  return current;
}

/**
 * Get the base type name from a possibly wrapped type
 */
export function getBaseTypeName(typeRef: IntrospectionTypeRef): string | null {
  return unwrapType(typeRef).name;
}

/**
 * Check if a type reference is non-null (required)
 */
export function isNonNull(typeRef: IntrospectionTypeRef): boolean {
  return typeRef.kind === 'NON_NULL';
}

/**
 * Check if a type reference is a list
 */
export function isList(typeRef: IntrospectionTypeRef): boolean {
  if (typeRef.kind === 'LIST') return true;
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return typeRef.ofType.kind === 'LIST';
  }
  return false;
}
