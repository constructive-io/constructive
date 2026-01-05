/**
 * Transform GraphQL introspection data to clean operation types
 * 
 * This module converts raw introspection responses into the CleanOperation
 * format used by code generators.
 */
import type {
  IntrospectionQueryResponse,
  IntrospectionType,
  IntrospectionField,
  IntrospectionTypeRef,
  IntrospectionInputValue,
} from '../../types/introspection';
import {
  unwrapType,
  getBaseTypeName,
  isNonNull,
} from '../../types/introspection';
import type {
  CleanOperation,
  CleanArgument,
  CleanTypeRef,
  CleanObjectField,
  TypeRegistry,
  ResolvedType,
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
export function buildTypeRegistry(
  types: IntrospectionType[]
): TypeRegistry {
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
        transformFieldToCleanObjectFieldShallow(field)
      );
    }

    // Resolve input fields for INPUT_OBJECT types
    if (type.kind === 'INPUT_OBJECT' && type.inputFields) {
      resolvedType.inputFields = type.inputFields.map((field) =>
        transformInputValueToCleanArgumentShallow(field)
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
  field: IntrospectionField
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
  inputValue: IntrospectionInputValue
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
  response: IntrospectionQueryResponse
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
        transformFieldToCleanOperation(field, 'query', types)
      )
    : [];

  // Transform mutations
  const mutations: CleanOperation[] = mutationTypeDef?.fields
    ? mutationTypeDef.fields.map((field) =>
        transformFieldToCleanOperation(field, 'mutation', types)
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
  types: IntrospectionType[]
): CleanOperation {
  return {
    name: field.name,
    kind,
    args: field.args.map((arg) => transformInputValueToCleanArgument(arg, types)),
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
  types: IntrospectionType[]
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
  types: IntrospectionType[]
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
  exclude?: string[]
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
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
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
 * Get the set of table-related operation names from tables
 * Used to identify which operations are already covered by table generators
 *
 * This includes:
 * - Basic CRUD: all, one, create, update, delete
 * - PostGraphile alternate mutations: updateXByY, deleteXByY (for unique constraints)
 */
export function getTableOperationNames(
  tables: Array<{
    name: string;
    query?: { all: string; one: string; create: string; update: string | null; delete: string | null };
    inflection?: { tableType: string };
  }>
): { queries: Set<string>; mutations: Set<string>; tableTypePatterns: RegExp[] } {
  const queries = new Set<string>();
  const mutations = new Set<string>();
  const tableTypePatterns: RegExp[] = [];

  for (const table of tables) {
    if (table.query) {
      queries.add(table.query.all);
      queries.add(table.query.one);
      mutations.add(table.query.create);
      if (table.query.update) mutations.add(table.query.update);
      if (table.query.delete) mutations.add(table.query.delete);
    }

    // Create patterns to match alternate CRUD mutations (updateXByY, deleteXByY)
    if (table.inflection?.tableType) {
      const typeName = table.inflection.tableType;
      // Match: update{TypeName}By*, delete{TypeName}By*
      tableTypePatterns.push(new RegExp(`^update${typeName}By`, 'i'));
      tableTypePatterns.push(new RegExp(`^delete${typeName}By`, 'i'));
    }
  }

  return { queries, mutations, tableTypePatterns };
}

/**
 * Check if an operation is a table operation (already handled by table generators)
 */
export function isTableOperation(
  operation: CleanOperation,
  tableOperationNames: { queries: Set<string>; mutations: Set<string>; tableTypePatterns: RegExp[] }
): boolean {
  if (operation.kind === 'query') {
    return tableOperationNames.queries.has(operation.name);
  }

  // Check exact match first
  if (tableOperationNames.mutations.has(operation.name)) {
    return true;
  }

  // Check pattern match for alternate CRUD mutations (updateXByY, deleteXByY)
  return tableOperationNames.tableTypePatterns.some((pattern) =>
    pattern.test(operation.name)
  );
}

/**
 * Get only custom operations (not covered by table generators)
 */
export function getCustomOperations(
  operations: CleanOperation[],
  tableOperationNames: { queries: Set<string>; mutations: Set<string>; tableTypePatterns: RegExp[] }
): CleanOperation[] {
  return operations.filter((op) => !isTableOperation(op, tableOperationNames));
}

// Re-export utility functions from introspection types
export { unwrapType, getBaseTypeName, isNonNull };
