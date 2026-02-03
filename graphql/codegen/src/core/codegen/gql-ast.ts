/**
 * GraphQL AST builders using gql-ast
 * 
 * Provides utilities for generating GraphQL queries and mutations via AST
 * instead of string concatenation.
 */
import * as t from 'gql-ast';
import { print, OperationTypeNode } from 'graphql';
import type {
  DocumentNode,
  FieldNode,
  ArgumentNode,
  VariableDefinitionNode,
} from 'graphql';
import type { CleanTable, CleanField } from '../../types/schema';
import {
  getTableNames,
  getAllRowsQueryName,
  getSingleRowQueryName,
  getCreateMutationName,
  getUpdateMutationName,
  getDeleteMutationName,
  getFilterTypeName,
  getConditionTypeName,
  getOrderByTypeName,
  getScalarFields,
  getPrimaryKeyInfo,
  ucFirst,
} from './utils';



// ============================================================================
// Field selection builders
// ============================================================================

/**
 * Create field selections from CleanField array
 */
function createFieldSelections(fields: CleanField[]): FieldNode[] {
  return fields.map((field) => t.field({ name: field.name }));
}

/**
 * Create pageInfo selection
 */
function createPageInfoSelection(): FieldNode {
  return t.field({
    name: 'pageInfo',
    selectionSet: t.selectionSet({
      selections: [
        t.field({ name: 'hasNextPage' }),
        t.field({ name: 'hasPreviousPage' }),
        t.field({ name: 'startCursor' }),
        t.field({ name: 'endCursor' }),
      ],
    }),
  });
}

// ============================================================================
// List query builder
// ============================================================================

export interface ListQueryConfig {
  table: CleanTable;
}

/**
 * Build a list query AST for a table
 */
export function buildListQueryAST(config: ListQueryConfig): DocumentNode {
  const { table } = config;
  const queryName = getAllRowsQueryName(table);
  const filterType = getFilterTypeName(table);
  const conditionType = getConditionTypeName(table);
  const orderByType = getOrderByTypeName(table);
  const scalarFields = getScalarFields(table);

  // Variable definitions - all pagination arguments from PostGraphile
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'first' }),
      type: t.namedType({ type: 'Int' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'last' }),
      type: t.namedType({ type: 'Int' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'offset' }),
      type: t.namedType({ type: 'Int' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'before' }),
      type: t.namedType({ type: 'Cursor' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'after' }),
      type: t.namedType({ type: 'Cursor' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'filter' }),
      type: t.namedType({ type: filterType }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'condition' }),
      type: t.namedType({ type: conditionType }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'orderBy' }),
      type: t.listType({
        type: t.nonNullType({ type: t.namedType({ type: orderByType }) }),
      }),
    }),
  ];

  // Query arguments
  const args: ArgumentNode[] = [
    t.argument({ name: 'first', value: t.variable({ name: 'first' }) }),
    t.argument({ name: 'last', value: t.variable({ name: 'last' }) }),
    t.argument({ name: 'offset', value: t.variable({ name: 'offset' }) }),
    t.argument({ name: 'before', value: t.variable({ name: 'before' }) }),
    t.argument({ name: 'after', value: t.variable({ name: 'after' }) }),
    t.argument({ name: 'filter', value: t.variable({ name: 'filter' }) }),
    t.argument({ name: 'condition', value: t.variable({ name: 'condition' }) }),
    t.argument({ name: 'orderBy', value: t.variable({ name: 'orderBy' }) }),
  ];

  // Field selections
  const fieldSelections = createFieldSelections(scalarFields);

  // Connection fields
  const connectionFields: FieldNode[] = [
    t.field({ name: 'totalCount' }),
    t.field({
      name: 'nodes',
      selectionSet: t.selectionSet({ selections: fieldSelections }),
    }),
    createPageInfoSelection(),
  ];

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: `${ucFirst(queryName)}Query`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: queryName,
              args,
              selectionSet: t.selectionSet({ selections: connectionFields }),
            }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// Single item query builder
// ============================================================================

export interface SingleQueryConfig {
  table: CleanTable;
}

/**
 * Build a single item query AST for a table
 */
export function buildSingleQueryAST(config: SingleQueryConfig): DocumentNode {
  const { table } = config;
  const queryName = getSingleRowQueryName(table);
  const scalarFields = getScalarFields(table);

  // Get primary key info dynamically from table constraints
  const pkFields = getPrimaryKeyInfo(table);
  // For simplicity, use first PK field (most common case)
  const pkField = pkFields[0];

  // Variable definitions - use dynamic PK field name and type
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: pkField.name }),
      type: t.nonNullType({ type: t.namedType({ type: pkField.gqlType }) }),
    }),
  ];

  // Query arguments - use dynamic PK field name
  const args: ArgumentNode[] = [
    t.argument({ name: pkField.name, value: t.variable({ name: pkField.name }) }),
  ];

  // Field selections
  const fieldSelections = createFieldSelections(scalarFields);

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: `${ucFirst(queryName)}Query`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: queryName,
              args,
              selectionSet: t.selectionSet({ selections: fieldSelections }),
            }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// Create mutation builder
// ============================================================================

export interface CreateMutationConfig {
  table: CleanTable;
}

/**
 * Build a create mutation AST for a table
 */
export function buildCreateMutationAST(config: CreateMutationConfig): DocumentNode {
  const { table } = config;
  const { typeName, singularName } = getTableNames(table);
  const mutationName = getCreateMutationName(table);
  const inputTypeName = `Create${typeName}Input`;
  const scalarFields = getScalarFields(table);

  // Variable definitions
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'input' }),
      type: t.nonNullType({ type: t.namedType({ type: inputTypeName }) }),
    }),
  ];

  // Mutation arguments
  const args: ArgumentNode[] = [
    t.argument({ name: 'input', value: t.variable({ name: 'input' }) }),
  ];

  // Field selections
  const fieldSelections = createFieldSelections(scalarFields);

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: `${ucFirst(mutationName)}Mutation`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: singularName,
                    selectionSet: t.selectionSet({ selections: fieldSelections }),
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// Update mutation builder
// ============================================================================

export interface UpdateMutationConfig {
  table: CleanTable;
}

/**
 * Build an update mutation AST for a table
 */
export function buildUpdateMutationAST(config: UpdateMutationConfig): DocumentNode {
  const { table } = config;
  const { typeName, singularName } = getTableNames(table);
  const mutationName = getUpdateMutationName(table);
  const inputTypeName = `Update${typeName}Input`;
  const scalarFields = getScalarFields(table);

  // Variable definitions
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'input' }),
      type: t.nonNullType({ type: t.namedType({ type: inputTypeName }) }),
    }),
  ];

  // Mutation arguments
  const args: ArgumentNode[] = [
    t.argument({ name: 'input', value: t.variable({ name: 'input' }) }),
  ];

  // Field selections
  const fieldSelections = createFieldSelections(scalarFields);

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: `${ucFirst(mutationName)}Mutation`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: singularName,
                    selectionSet: t.selectionSet({ selections: fieldSelections }),
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// Delete mutation builder
// ============================================================================

export interface DeleteMutationConfig {
  table: CleanTable;
}

/**
 * Build a delete mutation AST for a table
 */
export function buildDeleteMutationAST(config: DeleteMutationConfig): DocumentNode {
  const { table } = config;
  const { typeName } = getTableNames(table);
  const mutationName = getDeleteMutationName(table);
  const inputTypeName = `Delete${typeName}Input`;

  // Variable definitions
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'input' }),
      type: t.nonNullType({ type: t.namedType({ type: inputTypeName }) }),
    }),
  ];

  // Mutation arguments
  const args: ArgumentNode[] = [
    t.argument({ name: 'input', value: t.variable({ name: 'input' }) }),
  ];

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: `${ucFirst(mutationName)}Mutation`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({ name: 'clientMutationId' }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// Print utilities
// ============================================================================

/**
 * Print AST to GraphQL string
 */
export function printGraphQL(ast: DocumentNode): string {
  return print(ast);
}
