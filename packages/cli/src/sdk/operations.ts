/**
 * GraphQL operation builders for common SDK operations
 * Uses gql-ast for proper AST-based document building
 */

import * as t from 'gql-ast';
import { print, parseType } from '@0no-co/graphql.web';
import type { ArgumentNode, FieldNode, VariableDefinitionNode } from 'graphql';

/**
 * Build a findMany query document
 */
export function buildFindManyQuery(
  modelName: string,
  pluralName: string,
  select: Record<string, unknown>,
  options?: {
    where?: Record<string, unknown>;
    orderBy?: string[];
    first?: number;
    last?: number;
    after?: string;
    before?: string;
    offset?: number;
  }
): { document: string; variables: Record<string, unknown> } {
  const selections = buildSelections(select);
  const filterType = `${modelName}Filter`;
  const orderByType = `${capitalize(pluralName)}OrderBy`;

  const variableDefinitions: VariableDefinitionNode[] = [];
  const queryArgs: ArgumentNode[] = [];
  const variables: Record<string, unknown> = {};

  addVariable(
    { varName: 'where', argName: 'filter', typeName: filterType, value: options?.where },
    variableDefinitions,
    queryArgs,
    variables
  );
  addVariable(
    { varName: 'orderBy', typeName: `[${orderByType}!]`, value: options?.orderBy?.length ? options.orderBy : undefined },
    variableDefinitions,
    queryArgs,
    variables
  );
  addVariable(
    { varName: 'first', typeName: 'Int', value: options?.first },
    variableDefinitions,
    queryArgs,
    variables
  );
  addVariable(
    { varName: 'last', typeName: 'Int', value: options?.last },
    variableDefinitions,
    queryArgs,
    variables
  );
  addVariable(
    { varName: 'after', typeName: 'Cursor', value: options?.after },
    variableDefinitions,
    queryArgs,
    variables
  );
  addVariable(
    { varName: 'before', typeName: 'Cursor', value: options?.before },
    variableDefinitions,
    queryArgs,
    variables
  );
  addVariable(
    { varName: 'offset', typeName: 'Int', value: options?.offset },
    variableDefinitions,
    queryArgs,
    variables
  );

  const doc = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: `${modelName}FindMany`,
        variableDefinitions: variableDefinitions.length ? variableDefinitions : undefined,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: pluralName,
              args: queryArgs.length ? queryArgs : undefined,
              selectionSet: t.selectionSet({
                selections: buildConnectionSelections(selections),
              }),
            }),
          ],
        }),
      }),
    ],
  });

  return { document: print(doc), variables };
}

/**
 * Build a findFirst query document
 */
export function buildFindFirstQuery(
  modelName: string,
  pluralName: string,
  select: Record<string, unknown>,
  options?: {
    where?: Record<string, unknown>;
  }
): { document: string; variables: Record<string, unknown> } {
  const selections = buildSelections(select);
  const filterType = `${modelName}Filter`;

  const variableDefinitions: VariableDefinitionNode[] = [];
  const queryArgs: ArgumentNode[] = [];
  const variables: Record<string, unknown> = {};

  addVariable(
    { varName: 'first', typeName: 'Int', value: 1 },
    variableDefinitions,
    queryArgs,
    variables
  );
  addVariable(
    { varName: 'where', argName: 'filter', typeName: filterType, value: options?.where },
    variableDefinitions,
    queryArgs,
    variables
  );

  const doc = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: `${modelName}FindFirst`,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: pluralName,
              args: queryArgs,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: 'nodes',
                    selectionSet: t.selectionSet({ selections }),
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });

  return { document: print(doc), variables };
}

/**
 * Build a create mutation document
 */
export function buildCreateMutation(
  modelName: string,
  mutationName: string,
  fieldName: string,
  select: Record<string, unknown>,
  data: Record<string, unknown>,
  inputType: string
): { document: string; variables: Record<string, unknown> } {
  const selections = buildSelections(select);

  const doc = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'mutation',
        name: `${modelName}Create`,
        variableDefinitions: [
          t.variableDefinition({
            variable: t.variable({ name: 'input' }),
            type: parseType(`${inputType}!`),
          }),
        ],
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args: [
                t.argument({
                  name: 'input',
                  value: t.variable({ name: 'input' }),
                }),
              ],
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: fieldName,
                    selectionSet: t.selectionSet({ selections }),
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });

  return {
    document: print(doc),
    variables: {
      input: {
        [fieldName]: data,
      },
    },
  };
}

/**
 * Build an update mutation document
 */
export function buildUpdateMutation(
  modelName: string,
  mutationName: string,
  fieldName: string,
  select: Record<string, unknown>,
  where: { id: string },
  data: Record<string, unknown>,
  inputType: string
): { document: string; variables: Record<string, unknown> } {
  const selections = buildSelections(select);

  const doc = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'mutation',
        name: `${modelName}Update`,
        variableDefinitions: [
          t.variableDefinition({
            variable: t.variable({ name: 'input' }),
            type: parseType(`${inputType}!`),
          }),
        ],
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args: [
                t.argument({
                  name: 'input',
                  value: t.variable({ name: 'input' }),
                }),
              ],
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: fieldName,
                    selectionSet: t.selectionSet({ selections }),
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });

  return {
    document: print(doc),
    variables: {
      input: {
        id: where.id,
        patch: data,
      },
    },
  };
}

/**
 * Build a delete mutation document
 */
export function buildDeleteMutation(
  modelName: string,
  mutationName: string,
  fieldName: string,
  where: { id: string },
  inputType: string
): { document: string; variables: Record<string, unknown> } {
  const doc = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'mutation',
        name: `${modelName}Delete`,
        variableDefinitions: [
          t.variableDefinition({
            variable: t.variable({ name: 'input' }),
            type: parseType(`${inputType}!`),
          }),
        ],
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutationName,
              args: [
                t.argument({
                  name: 'input',
                  value: t.variable({ name: 'input' }),
                }),
              ],
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: fieldName,
                    selectionSet: t.selectionSet({
                      selections: [t.field({ name: 'id' })],
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

  return {
    document: print(doc),
    variables: {
      input: {
        id: where.id,
      },
    },
  };
}

interface VariableSpec {
  varName: string;
  argName?: string;
  typeName: string;
  value: unknown;
}

function addVariable(
  spec: VariableSpec,
  definitions: VariableDefinitionNode[],
  args: ArgumentNode[],
  variables: Record<string, unknown>
): void {
  if (spec.value === undefined) return;

  definitions.push(
    t.variableDefinition({
      variable: t.variable({ name: spec.varName }),
      type: parseType(spec.typeName),
    })
  );
  args.push(
    t.argument({
      name: spec.argName ?? spec.varName,
      value: t.variable({ name: spec.varName }),
    })
  );
  variables[spec.varName] = spec.value;
}

function buildSelections(select: Record<string, unknown>): FieldNode[] {
  const fields: FieldNode[] = [];

  for (const [key, value] of Object.entries(select)) {
    if (value === false || value === undefined) {
      continue;
    }

    if (value === true) {
      fields.push(t.field({ name: key }));
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const nested = value as Record<string, unknown>;
      if (nested.nodes) {
        fields.push(
          t.field({
            name: key,
            selectionSet: t.selectionSet({
              selections: [
                t.field({
                  name: 'nodes',
                  selectionSet: t.selectionSet({
                    selections: buildSelections(nested.nodes as Record<string, unknown>),
                  }),
                }),
              ],
            }),
          })
        );
      } else {
        fields.push(
          t.field({
            name: key,
            selectionSet: t.selectionSet({
              selections: buildSelections(nested),
            }),
          })
        );
      }
    }
  }

  return fields;
}

function buildPageInfoSelections(): FieldNode[] {
  return [
    t.field({ name: 'hasNextPage' }),
    t.field({ name: 'hasPreviousPage' }),
    t.field({ name: 'startCursor' }),
    t.field({ name: 'endCursor' }),
  ];
}

function buildConnectionSelections(nodeSelections: FieldNode[]): FieldNode[] {
  return [
    t.field({
      name: 'nodes',
      selectionSet: t.selectionSet({ selections: nodeSelections }),
    }),
    t.field({ name: 'totalCount' }),
    t.field({
      name: 'pageInfo',
      selectionSet: t.selectionSet({ selections: buildPageInfoSelections() }),
    }),
  ];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to PascalCase
 */
export function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert PascalCase to camelCase
 */
export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Get plural form of a model name (simple heuristic)
 */
export function pluralize(name: string): string {
  if (name.endsWith('y')) {
    return name.slice(0, -1) + 'ies';
  }
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('ch') || name.endsWith('sh')) {
    return name + 'es';
  }
  return name + 's';
}
