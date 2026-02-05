/**
 * Dynamic GraphQL AST builders for custom operations
 *
 * Generates GraphQL query/mutation documents from CleanOperation data
 * using gql-ast library for proper AST construction.
 */
import * as t from 'gql-ast';
import { print, OperationTypeNode } from 'graphql';
import type {
  DocumentNode,
  FieldNode,
  ArgumentNode,
  VariableDefinitionNode,
  TypeNode,
} from 'graphql';
import type {
  CleanOperation,
  CleanArgument,
  CleanTypeRef,
  CleanObjectField,
  TypeRegistry,
} from '../../types/schema';
import { getBaseTypeKind, shouldSkipField } from './type-resolver';

// ============================================================================
// Configuration
// ============================================================================

export interface FieldSelectionConfig {
  /** Max depth for nested object selections */
  maxDepth: number;
  /** Skip the 'query' field in payloads */
  skipQueryField: boolean;
  /** Type registry for resolving nested types */
  typeRegistry?: TypeRegistry;
}

// ============================================================================
// Type Node Builders (GraphQL Type AST)
// ============================================================================

/**
 * Build a GraphQL type node from CleanTypeRef
 * Handles NON_NULL, LIST, and named types
 */
function buildTypeNode(typeRef: CleanTypeRef): TypeNode {
  switch (typeRef.kind) {
    case 'NON_NULL':
      if (typeRef.ofType) {
        const innerType = buildTypeNode(typeRef.ofType);
        // Can't wrap NON_NULL in NON_NULL
        if (innerType.kind === 'NonNullType') {
          return innerType;
        }
        return t.nonNullType({ type: innerType as any });
      }
      return t.namedType({ type: 'String' });

    case 'LIST':
      if (typeRef.ofType) {
        return t.listType({ type: buildTypeNode(typeRef.ofType) });
      }
      return t.listType({ type: t.namedType({ type: 'String' }) });

    case 'SCALAR':
    case 'ENUM':
    case 'OBJECT':
    case 'INPUT_OBJECT':
      return t.namedType({ type: typeRef.name ?? 'String' });

    default:
      return t.namedType({ type: typeRef.name ?? 'String' });
  }
}

// ============================================================================
// Variable Definition Builders
// ============================================================================

/**
 * Build variable definitions from operation arguments
 */
export function buildVariableDefinitions(
  args: CleanArgument[]
): VariableDefinitionNode[] {
  return args.map((arg) =>
    t.variableDefinition({
      variable: t.variable({ name: arg.name }),
      type: buildTypeNode(arg.type),
    })
  );
}

/**
 * Build argument nodes that reference variables
 */
function buildArgumentNodes(args: CleanArgument[]): ArgumentNode[] {
  return args.map((arg) =>
    t.argument({
      name: arg.name,
      value: t.variable({ name: arg.name }),
    })
  );
}

// ============================================================================
// Field Selection Builders
// ============================================================================

/**
 * Check if a type should have selections (is an object type)
 */
function typeNeedsSelections(typeRef: CleanTypeRef): boolean {
  const baseKind = getBaseTypeKind(typeRef);
  return baseKind === 'OBJECT';
}

/**
 * Get the resolved fields for a type reference
 * Uses type registry for deep resolution
 */
function getResolvedFields(
  typeRef: CleanTypeRef,
  typeRegistry?: TypeRegistry
): CleanObjectField[] | undefined {
  // First check if fields are directly on the typeRef
  if (typeRef.fields) {
    return typeRef.fields;
  }

  // For wrapper types, unwrap and check
  if (typeRef.ofType) {
    return getResolvedFields(typeRef.ofType, typeRegistry);
  }

  // Look up in type registry
  if (typeRegistry && typeRef.name) {
    const resolved = typeRegistry.get(typeRef.name);
    if (resolved?.fields) {
      return resolved.fields;
    }
  }

  return undefined;
}

/**
 * Build field selections for an object type
 * Recursively handles nested objects up to maxDepth
 */
export function buildFieldSelections(
  typeRef: CleanTypeRef,
  config: FieldSelectionConfig,
  currentDepth: number = 0
): FieldNode[] {
  const { maxDepth, skipQueryField, typeRegistry } = config;

  // Stop recursion at max depth
  if (currentDepth >= maxDepth) {
    return [];
  }

  const fields = getResolvedFields(typeRef, typeRegistry);
  if (!fields || fields.length === 0) {
    return [];
  }

  const selections: FieldNode[] = [];

  for (const field of fields) {
    // Skip internal fields
    if (shouldSkipField(field.name, skipQueryField)) {
      continue;
    }

    const fieldKind = getBaseTypeKind(field.type);

    // For scalar and enum types, just add the field
    if (fieldKind === 'SCALAR' || fieldKind === 'ENUM') {
      selections.push(t.field({ name: field.name }));
      continue;
    }

    // For object types, recurse if within depth limit
    if (fieldKind === 'OBJECT' && currentDepth < maxDepth - 1) {
      const nestedSelections = buildFieldSelections(
        field.type,
        config,
        currentDepth + 1
      );

      if (nestedSelections.length > 0) {
        selections.push(
          t.field({
            name: field.name,
            selectionSet: t.selectionSet({ selections: nestedSelections }),
          })
        );
      }
    }
  }

  return selections;
}

/**
 * Build selections for a return type, handling connections and payloads
 */
function buildReturnTypeSelections(
  returnType: CleanTypeRef,
  config: FieldSelectionConfig
): FieldNode[] {
  const fields = getResolvedFields(returnType, config.typeRegistry);

  if (!fields || fields.length === 0) {
    return [];
  }

  // Check if this is a connection type
  const hasNodes = fields.some((f) => f.name === 'nodes');
  const hasTotalCount = fields.some((f) => f.name === 'totalCount');

  if (hasNodes && hasTotalCount) {
    return buildConnectionSelections(fields, config);
  }

  // Check if this is a mutation payload (has clientMutationId)
  const hasClientMutationId = fields.some(
    (f) => f.name === 'clientMutationId'
  );

  if (hasClientMutationId) {
    return buildPayloadSelections(fields, config);
  }

  // Regular object - build normal selections
  return buildFieldSelections(returnType, config);
}

/**
 * Build selections for a connection type
 */
function buildConnectionSelections(
  fields: CleanObjectField[],
  config: FieldSelectionConfig
): FieldNode[] {
  const selections: FieldNode[] = [];

  // Add totalCount
  const totalCountField = fields.find((f) => f.name === 'totalCount');
  if (totalCountField) {
    selections.push(t.field({ name: 'totalCount' }));
  }

  // Add nodes with nested selections
  const nodesField = fields.find((f) => f.name === 'nodes');
  if (nodesField) {
    const nodeSelections = buildFieldSelections(nodesField.type, config);
    if (nodeSelections.length > 0) {
      selections.push(
        t.field({
          name: 'nodes',
          selectionSet: t.selectionSet({ selections: nodeSelections }),
        })
      );
    }
  }

  // Add pageInfo
  const pageInfoField = fields.find((f) => f.name === 'pageInfo');
  if (pageInfoField) {
    selections.push(
      t.field({
        name: 'pageInfo',
        selectionSet: t.selectionSet({
          selections: [
            t.field({ name: 'hasNextPage' }),
            t.field({ name: 'hasPreviousPage' }),
            t.field({ name: 'startCursor' }),
            t.field({ name: 'endCursor' }),
          ],
        }),
      })
    );
  }

  return selections;
}

/**
 * Build selections for a mutation payload type
 */
function buildPayloadSelections(
  fields: CleanObjectField[],
  config: FieldSelectionConfig
): FieldNode[] {
  const selections: FieldNode[] = [];

  for (const field of fields) {
    // Skip query field
    if (shouldSkipField(field.name, config.skipQueryField)) {
      continue;
    }

    const fieldKind = getBaseTypeKind(field.type);

    // Add scalar fields directly
    if (fieldKind === 'SCALAR' || fieldKind === 'ENUM') {
      selections.push(t.field({ name: field.name }));
      continue;
    }

    // For object fields (like the returned entity), add with selections
    if (fieldKind === 'OBJECT') {
      const nestedSelections = buildFieldSelections(field.type, config);
      if (nestedSelections.length > 0) {
        selections.push(
          t.field({
            name: field.name,
            selectionSet: t.selectionSet({ selections: nestedSelections }),
          })
        );
      }
    }
  }

  return selections;
}

// ============================================================================
// Custom Query Builder
// ============================================================================

export interface CustomQueryConfig {
  operation: CleanOperation;
  typeRegistry?: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
}

/**
 * Build a custom query AST from a CleanOperation
 */
export function buildCustomQueryAST(config: CustomQueryConfig): DocumentNode {
  const {
    operation,
    typeRegistry,
    maxDepth = 2,
    skipQueryField = true,
  } = config;

  const operationName = `${ucFirst(operation.name)}Query`;

  // Build variable definitions
  const variableDefinitions = buildVariableDefinitions(operation.args);

  // Build arguments that reference the variables
  const args = buildArgumentNodes(operation.args);

  // Build return type selections
  const fieldSelectionConfig: FieldSelectionConfig = {
    maxDepth,
    skipQueryField,
    typeRegistry,
  };

  const returnTypeNeedsSelections = typeNeedsSelections(operation.returnType);
  let selections: FieldNode[] = [];

  if (returnTypeNeedsSelections) {
    selections = buildReturnTypeSelections(
      operation.returnType,
      fieldSelectionConfig
    );
  }

  // Build the query field
  const queryField: FieldNode =
    selections.length > 0
      ? t.field({
          name: operation.name,
          args: args.length > 0 ? args : undefined,
          selectionSet: t.selectionSet({ selections }),
        })
      : t.field({
          name: operation.name,
          args: args.length > 0 ? args : undefined,
        });

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: operationName,
        variableDefinitions:
          variableDefinitions.length > 0 ? variableDefinitions : undefined,
        selectionSet: t.selectionSet({
          selections: [queryField],
        }),
      }),
    ],
  });
}

// ============================================================================
// Custom Mutation Builder
// ============================================================================

export interface CustomMutationConfig {
  operation: CleanOperation;
  typeRegistry?: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
}

/**
 * Build a custom mutation AST from a CleanOperation
 */
export function buildCustomMutationAST(
  config: CustomMutationConfig
): DocumentNode {
  const {
    operation,
    typeRegistry,
    maxDepth = 2,
    skipQueryField = true,
  } = config;

  const operationName = `${ucFirst(operation.name)}Mutation`;

  // Build variable definitions
  const variableDefinitions = buildVariableDefinitions(operation.args);

  // Build arguments that reference the variables
  const args = buildArgumentNodes(operation.args);

  // Build return type selections
  const fieldSelectionConfig: FieldSelectionConfig = {
    maxDepth,
    skipQueryField,
    typeRegistry,
  };

  const returnTypeNeedsSelections = typeNeedsSelections(operation.returnType);
  let selections: FieldNode[] = [];

  if (returnTypeNeedsSelections) {
    selections = buildReturnTypeSelections(
      operation.returnType,
      fieldSelectionConfig
    );
  }

  // Build the mutation field
  const mutationField: FieldNode =
    selections.length > 0
      ? t.field({
          name: operation.name,
          args: args.length > 0 ? args : undefined,
          selectionSet: t.selectionSet({ selections }),
        })
      : t.field({
          name: operation.name,
          args: args.length > 0 ? args : undefined,
        });

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: operationName,
        variableDefinitions:
          variableDefinitions.length > 0 ? variableDefinitions : undefined,
        selectionSet: t.selectionSet({
          selections: [mutationField],
        }),
      }),
    ],
  });
}

// ============================================================================
// Print Utilities
// ============================================================================

/**
 * Print a document AST to GraphQL string
 */
export function printGraphQL(ast: DocumentNode): string {
  return print(ast);
}

/**
 * Build and print a custom query in one call
 */
export function buildCustomQueryString(config: CustomQueryConfig): string {
  return printGraphQL(buildCustomQueryAST(config));
}

/**
 * Build and print a custom mutation in one call
 */
export function buildCustomMutationString(
  config: CustomMutationConfig
): string {
  return printGraphQL(buildCustomMutationAST(config));
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Uppercase first character
 */
function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
