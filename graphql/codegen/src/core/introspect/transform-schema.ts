/**
 * Transform GraphQL introspection data to clean operation types
 *
 * This module converts raw introspection responses into the CleanOperation
 * format used by code generators.
 */
import type {
  IntrospectionField,
  IntrospectionInputValue,
  IntrospectionQueryResponse,
  IntrospectionType,
  IntrospectionTypeRef,
} from '../../types/introspection';
import {
  getBaseTypeName,
  isNonNull,
  unwrapType,
} from '../../types/introspection';
import type {
  CleanArgument,
  CleanObjectField,
  CleanOperation,
  CleanTypeRef,
  ResolvedType,
  TypeRegistry,
} from '../../types/schema';

// ============================================================================
// Type Registry Builder
// ============================================================================

/**
 * Build a type registry from introspection types
 * Maps type names to their full resolved definitions
 *
 * This is a two-pass process to handle circular references:
 * 1. First pass: Create all type entries with basic info
 * 2. Second pass: Resolve fields with references to other types
 */
export function buildTypeRegistry(types: IntrospectionType[]): TypeRegistry {
  const registry: TypeRegistry = new Map();

  // First pass: Create all type entries
  for (const type of types) {
    // Skip built-in types that start with __
    if (type.name.startsWith('__')) continue;

    const resolvedType: ResolvedType = {
      kind: type.kind as ResolvedType['kind'],
      name: type.name,
      description: type.description ?? undefined,
    };

    // Resolve enum values for ENUM types (no circular refs possible)
    if (type.kind === 'ENUM' && type.enumValues) {
      resolvedType.enumValues = type.enumValues.map((ev) => ev.name);
    }

    // Resolve possible types for UNION types (no circular refs for names)
    if (type.kind === 'UNION' && type.possibleTypes) {
      resolvedType.possibleTypes = type.possibleTypes.map((pt) => pt.name);
    }

    registry.set(type.name, resolvedType);
  }

  // Second pass: Resolve fields (now that all types exist in registry)
  for (const type of types) {
    if (type.name.startsWith('__')) continue;

    const resolvedType = registry.get(type.name);
    if (!resolvedType) continue;

    // Resolve fields for OBJECT types
    if (type.kind === 'OBJECT' && type.fields) {
      resolvedType.fields = type.fields.map((field) =>
        transformFieldToCleanObjectFieldShallow(field),
      );
    }

    // Resolve input fields for INPUT_OBJECT types
    if (type.kind === 'INPUT_OBJECT' && type.inputFields) {
      resolvedType.inputFields = type.inputFields.map((field) =>
        transformInputValueToCleanArgumentShallow(field),
      );
    }
  }

  return registry;
}

/**
 * Transform field to CleanObjectField without resolving nested types
 * (shallow transformation to avoid circular refs)
 */
function transformFieldToCleanObjectFieldShallow(
  field: IntrospectionField,
): CleanObjectField {
  return {
    name: field.name,
    type: transformTypeRefShallow(field.type),
    description: field.description ?? undefined,
  };
}

/**
 * Transform input value to CleanArgument without resolving nested types
 */
function transformInputValueToCleanArgumentShallow(
  inputValue: IntrospectionInputValue,
): CleanArgument {
  return {
    name: inputValue.name,
    type: transformTypeRefShallow(inputValue.type),
    defaultValue: inputValue.defaultValue ?? undefined,
    description: inputValue.description ?? undefined,
  };
}

/**
 * Transform TypeRef without resolving nested types
 * Only handles wrappers (LIST, NON_NULL) and stores the type name
 */
function transformTypeRefShallow(typeRef: IntrospectionTypeRef): CleanTypeRef {
  const cleanRef: CleanTypeRef = {
    kind: typeRef.kind as CleanTypeRef['kind'],
    name: typeRef.name,
  };

  if (typeRef.ofType) {
    cleanRef.ofType = transformTypeRefShallow(typeRef.ofType);
  }

  return cleanRef;
}

// ============================================================================
// Schema Transformation
// ============================================================================

export interface TransformSchemaResult {
  queries: CleanOperation[];
  mutations: CleanOperation[];
  typeRegistry: TypeRegistry;
}

/**
 * Transform introspection response to clean operations
 */
export function transformSchemaToOperations(
  response: IntrospectionQueryResponse,
): TransformSchemaResult {
  const { __schema: schema } = response;
  const { types, queryType, mutationType } = schema;

  // Build type registry first
  const typeRegistry = buildTypeRegistry(types);

  // Find Query and Mutation types
  const queryTypeDef = types.find((t) => t.name === queryType.name);
  const mutationTypeDef = mutationType
    ? types.find((t) => t.name === mutationType.name)
    : null;

  // Transform queries
  const queries: CleanOperation[] = queryTypeDef?.fields
    ? queryTypeDef.fields.map((field) =>
        transformFieldToCleanOperation(field, 'query', types),
      )
    : [];

  // Transform mutations
  const mutations: CleanOperation[] = mutationTypeDef?.fields
    ? mutationTypeDef.fields.map((field) =>
        transformFieldToCleanOperation(field, 'mutation', types),
      )
    : [];

  return { queries, mutations, typeRegistry };
}

// ============================================================================
// Field to Operation Transformation
// ============================================================================

/**
 * Transform an introspection field to a CleanOperation
 */
function transformFieldToCleanOperation(
  field: IntrospectionField,
  kind: 'query' | 'mutation',
  types: IntrospectionType[],
): CleanOperation {
  return {
    name: field.name,
    kind,
    args: field.args.map((arg) =>
      transformInputValueToCleanArgument(arg, types),
    ),
    returnType: transformTypeRefToCleanTypeRef(field.type, types),
    description: field.description ?? undefined,
    isDeprecated: field.isDeprecated,
    deprecationReason: field.deprecationReason ?? undefined,
  };
}

/**
 * Transform an input value to CleanArgument
 */
function transformInputValueToCleanArgument(
  inputValue: IntrospectionInputValue,
  types: IntrospectionType[],
): CleanArgument {
  return {
    name: inputValue.name,
    type: transformTypeRefToCleanTypeRef(inputValue.type, types),
    defaultValue: inputValue.defaultValue ?? undefined,
    description: inputValue.description ?? undefined,
  };
}

// ============================================================================
// Type Reference Transformation
// ============================================================================

/**
 * Transform an introspection TypeRef to CleanTypeRef
 * Recursively handles wrapper types (LIST, NON_NULL)
 *
 * NOTE: We intentionally do NOT resolve nested fields here to avoid
 * infinite recursion from circular type references. Fields are resolved
 * lazily via the TypeRegistry when needed for code generation.
 */
function transformTypeRefToCleanTypeRef(
  typeRef: IntrospectionTypeRef,
  types: IntrospectionType[],
): CleanTypeRef {
  const cleanRef: CleanTypeRef = {
    kind: typeRef.kind as CleanTypeRef['kind'],
    name: typeRef.name,
  };

  // Recursively transform ofType for wrappers (LIST, NON_NULL)
  if (typeRef.ofType) {
    cleanRef.ofType = transformTypeRefToCleanTypeRef(typeRef.ofType, types);
  }

  // For named types, only resolve enum values (they don't have circular refs)
  // Fields are NOT resolved here - they're resolved via TypeRegistry during codegen
  if (typeRef.name && !typeRef.ofType) {
    const typeDef = types.find((t) => t.name === typeRef.name);
    if (typeDef) {
      // Add enum values for ENUM types (safe, no recursion)
      if (typeDef.kind === 'ENUM' && typeDef.enumValues) {
        cleanRef.enumValues = typeDef.enumValues.map((ev) => ev.name);
      }
      // NOTE: OBJECT and INPUT_OBJECT fields are resolved via TypeRegistry
      // to avoid circular reference issues
    }
  }

  return cleanRef;
}

// ============================================================================
// Operation Filtering
// ============================================================================

/**
 * Filter operations by include/exclude patterns
 * Uses glob-like patterns (supports * wildcard)
 */
export function filterOperations(
  operations: CleanOperation[],
  include?: string[],
  exclude?: string[],
): CleanOperation[] {
  let result = operations;

  if (include && include.length > 0) {
    result = result.filter((op) => matchesPatterns(op.name, include));
  }

  if (exclude && exclude.length > 0) {
    result = result.filter((op) => !matchesPatterns(op.name, exclude));
  }

  return result;
}

/**
 * Check if a name matches any of the patterns
 * Supports simple glob patterns with * wildcard
 */
function matchesPatterns(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      );
      return regex.test(name);
    }
    return name === pattern;
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Result type for table operation names lookup
 */
export interface TableOperationNames {
  queries: Set<string>;
  mutations: Set<string>;
}

/**
 * Get the set of table-related operation names from tables
 * Used to identify which operations are already covered by table generators
 *
 * IMPORTANT: This uses EXACT matches only from _meta.query fields.
 * Any operation not explicitly listed in _meta will flow through as a
 * custom operation, ensuring 100% coverage of the schema.
 *
 * Table operations (generated by table generators):
 * - Queries: all (list), one (single by PK)
 * - Mutations: create, update (by PK), delete (by PK)
 *
 * Custom operations (generated by custom operation generators):
 * - Unique constraint lookups: *ByUsername, *ByEmail, etc.
 * - Unique constraint mutations: update*By*, delete*By*
 * - True custom operations: login, register, bootstrapUser, etc.
 */
export function getTableOperationNames(
  tables: Array<{
    name: string;
    query?: {
      all: string;
      one: string;
      create: string;
      update: string | null;
      delete: string | null;
    };
  }>,
): TableOperationNames {
  const queries = new Set<string>();
  const mutations = new Set<string>();

  for (const table of tables) {
    if (table.query) {
      // Add exact query names from _meta
      queries.add(table.query.all);
      queries.add(table.query.one);

      // Add exact mutation names from _meta
      mutations.add(table.query.create);
      if (table.query.update) mutations.add(table.query.update);
      if (table.query.delete) mutations.add(table.query.delete);
    }
  }

  return { queries, mutations };
}

/**
 * Check if an operation is a table operation (already handled by table generators)
 *
 * Uses EXACT match only - no pattern matching. This ensures:
 * 1. Only operations explicitly in _meta.query are treated as table operations
 * 2. All other operations (including update*By*, delete*By*) become custom operations
 * 3. 100% schema coverage is guaranteed
 */
export function isTableOperation(
  operation: CleanOperation,
  tableOperationNames: TableOperationNames,
): boolean {
  if (operation.kind === 'query') {
    return tableOperationNames.queries.has(operation.name);
  }
  return tableOperationNames.mutations.has(operation.name);
}

/**
 * Get only custom operations (not covered by table generators)
 *
 * This returns ALL operations that are not exact matches for table CRUD operations.
 * Includes:
 * - Unique constraint queries (*ByUsername, *ByEmail, etc.)
 * - Unique constraint mutations (update*By*, delete*By*)
 * - True custom operations (login, register, bootstrapUser, etc.)
 */
export function getCustomOperations(
  operations: CleanOperation[],
  tableOperationNames: TableOperationNames,
): CleanOperation[] {
  return operations.filter((op) => !isTableOperation(op, tableOperationNames));
}

// Re-export utility functions from introspection types
export { getBaseTypeName, isNonNull, unwrapType };
