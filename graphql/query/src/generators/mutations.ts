/**
 * Mutation generators for CREATE, UPDATE, and DELETE operations
 * Uses AST-based approach for PostGraphile-compatible mutations
 */
import * as t from 'gql-ast';
import { OperationTypeNode, print } from 'graphql';
import type { ArgumentNode, FieldNode, VariableDefinitionNode } from 'graphql';

import { TypedDocumentString } from '../client/typed-document';
import {
  getCustomAstForCleanField,
  requiresSubfieldSelection,
} from '../custom-ast';
import type { MutationOptions } from '../types/mutation';
import type { Table } from '../types/schema';
import { isRelationalField } from './field-selector';
import {
  toCamelCaseSingular,
  toCreateInputTypeName,
  toCreateMutationName,
  toDeleteInputTypeName,
  toDeleteMutationName,
  toUpdateInputTypeName,
  toUpdateMutationName,
} from './naming-helpers';

/**
 * Generate field selections for PostGraphile mutations using custom AST logic
 * This handles both scalar fields and complex types that require subfield selections
 */
function generateFieldSelections(table: Table): FieldNode[] {
  return table.fields
    .filter((field) => !isRelationalField(field.name, table)) // Exclude relational fields
    .map((field) => {
      if (requiresSubfieldSelection(field)) {
        // Use custom AST generation for complex types
        return getCustomAstForCleanField(field);
      } else {
        // Use simple field selection for scalar types
        return t.field({ name: field.name });
      }
    });
}

/**
 * Build PostGraphile-style CREATE mutation
 * PostGraphile expects: mutation { createTableName(input: { tableName: TableNameInput! }) { tableName { ... } } }
 */
export function buildPostGraphileCreate(
  table: Table,
  _allTables: Table[],
  _options: MutationOptions = {},
): TypedDocumentString<
  Record<string, unknown>,
  { input: { [key: string]: Record<string, unknown> } }
> {
  const mutationName = toCreateMutationName(table.name, table);
  const singularName = toCamelCaseSingular(table.name, table);
  const inputTypeName = toCreateInputTypeName(table.name, table);

  // Create the variable definition for $input
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'input' }),
      type: t.nonNullType({
        type: t.namedType({ type: inputTypeName }),
      }),
    }),
  ];

  // Create the mutation arguments
  const mutationArgs: ArgumentNode[] = [
    t.argument({
      name: 'input',
      value: t.variable({ name: 'input' }),
    }),
  ];

  // Get the field selections for the return value using custom AST logic
  const fieldSelections: FieldNode[] = generateFieldSelections(table);

  // Build the mutation AST
  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: `${mutationName}Mutation`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args: mutationArgs,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: singularName,
                    selectionSet: t.selectionSet({
                      selections: fieldSelections,
                    }),
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Print the AST to get the query string
  const queryString = print(ast);

  return new TypedDocumentString(queryString, {
    __ast: ast,
  }) as TypedDocumentString<
    Record<string, unknown>,
    { input: { [key: string]: Record<string, unknown> } }
  >;
}

/**
 * Build PostGraphile-style UPDATE mutation
 * PostGraphile expects: mutation { updateTableName(input: { id: UUID!, patch: TableNamePatch! }) { tableName { ... } } }
 */
export function buildPostGraphileUpdate(
  table: Table,
  _allTables: Table[],
  _options: MutationOptions = {},
): TypedDocumentString<
  Record<string, unknown>,
  { input: { id: string | number } & Record<string, unknown> }
> {
  const mutationName = toUpdateMutationName(table.name, table);
  const singularName = toCamelCaseSingular(table.name, table);
  const inputTypeName = toUpdateInputTypeName(table.name);

  // Create the variable definition for $input
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'input' }),
      type: t.nonNullType({
        type: t.namedType({ type: inputTypeName }),
      }),
    }),
  ];

  // Create the mutation arguments
  const mutationArgs: ArgumentNode[] = [
    t.argument({
      name: 'input',
      value: t.variable({ name: 'input' }),
    }),
  ];

  // Get the field selections for the return value using custom AST logic
  const fieldSelections: FieldNode[] = generateFieldSelections(table);

  // Build the mutation AST
  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: `${mutationName}Mutation`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args: mutationArgs,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: singularName,
                    selectionSet: t.selectionSet({
                      selections: fieldSelections,
                    }),
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Print the AST to get the query string
  const queryString = print(ast);

  return new TypedDocumentString(queryString, {
    __ast: ast,
  }) as TypedDocumentString<
    Record<string, unknown>,
    { input: { id: string | number } & Record<string, unknown> }
  >;
}

/**
 * Build PostGraphile-style DELETE mutation
 * PostGraphile expects: mutation { deleteTableName(input: { id: UUID! }) { clientMutationId } }
 */
export function buildPostGraphileDelete(
  table: Table,
  _allTables: Table[],
  _options: MutationOptions = {},
): TypedDocumentString<
  Record<string, unknown>,
  { input: { id: string | number } }
> {
  const mutationName = toDeleteMutationName(table.name, table);
  const inputTypeName = toDeleteInputTypeName(table.name);

  // Create the variable definition for $input
  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'input' }),
      type: t.nonNullType({
        type: t.namedType({ type: inputTypeName }),
      }),
    }),
  ];

  // Create the mutation arguments
  const mutationArgs: ArgumentNode[] = [
    t.argument({
      name: 'input',
      value: t.variable({ name: 'input' }),
    }),
  ];

  // PostGraphile delete mutations typically return clientMutationId
  const fieldSelections: FieldNode[] = [t.field({ name: 'clientMutationId' })];

  // Build the mutation AST
  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: `${mutationName}Mutation`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args: mutationArgs,
              selectionSet: t.selectionSet({
                selections: fieldSelections,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Print the AST to get the query string
  const queryString = print(ast);

  return new TypedDocumentString(queryString, {
    __ast: ast,
  }) as TypedDocumentString<
    Record<string, unknown>,
    { input: { id: string | number } }
  >;
}
