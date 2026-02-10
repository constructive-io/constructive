/**
 * Query Builder - Builds and executes GraphQL operations
 *
 * This is the RUNTIME code that gets copied to generated output.
 * It uses gql-ast to build GraphQL documents programmatically.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated ORM clients.
 */

import { parseType, print } from '@0no-co/graphql.web';
import * as t from 'gql-ast';
import type {
  ArgumentNode,
  EnumValueNode,
  FieldNode,
  VariableDefinitionNode,
} from 'graphql';

import { GraphQLRequestError, OrmClient, QueryResult } from './client';

export interface QueryBuilderConfig<TResult> {
  client: OrmClient;
  operation: 'query' | 'mutation';
  operationName: string;
  fieldName: string;
  document: string;
  variables?: Record<string, unknown>;
  transform?: (data: any) => TResult;
}

export class QueryBuilder<TResult> {
  private config: QueryBuilderConfig<TResult>;

  constructor(config: QueryBuilderConfig<TResult>) {
    this.config = config;
  }

  /**
   * Execute the query and return a discriminated union result
   * Use result.ok to check success, or .unwrap() to throw on error
   */
  async execute(): Promise<QueryResult<TResult>> {
    const rawResult = await this.config.client.execute<any>(
      this.config.document,
      this.config.variables,
    );
    if (!rawResult.ok) {
      return rawResult;
    }
    if (!this.config.transform) {
      return rawResult as unknown as QueryResult<TResult>;
    }
    return {
      ok: true,
      data: this.config.transform(rawResult.data),
      errors: undefined,
    };
  }

  /**
   * Execute and unwrap the result, throwing GraphQLRequestError on failure
   * @throws {GraphQLRequestError} If the query returns errors
   */
  async unwrap(): Promise<TResult> {
    const result = await this.execute();
    if (!result.ok) {
      throw new GraphQLRequestError(result.errors, result.data);
    }
    return result.data;
  }

  /**
   * Execute and unwrap, returning defaultValue on error instead of throwing
   */
  async unwrapOr<D>(defaultValue: D): Promise<TResult | D> {
    const result = await this.execute();
    if (!result.ok) {
      return defaultValue;
    }
    return result.data;
  }

  /**
   * Execute and unwrap, calling onError callback on failure
   */
  async unwrapOrElse<D>(
    onError: (errors: import('./client').GraphQLError[]) => D,
  ): Promise<TResult | D> {
    const result = await this.execute();
    if (!result.ok) {
      return onError(result.errors);
    }
    return result.data;
  }

  toGraphQL(): string {
    return this.config.document;
  }

  getVariables(): Record<string, unknown> | undefined {
    return this.config.variables;
  }
}

const OP_QUERY = 'query' as unknown as import('graphql').OperationTypeNode;
const OP_MUTATION = 'mutation' as unknown as import('graphql').OperationTypeNode;
const ENUM_VALUE_KIND = 'EnumValue' as unknown as EnumValueNode['kind'];

// ============================================================================
// Selection Builders
// ============================================================================

export function buildSelections(
  select: Record<string, unknown> | undefined,
  connectionFieldsMap?: Record<string, Record<string, string>>,
  entityType?: string,
): FieldNode[] {
  if (!select) {
    return [];
  }

  const fields: FieldNode[] = [];
  const entityConnections = entityType
    ? connectionFieldsMap?.[entityType]
    : undefined;

  for (const [key, value] of Object.entries(select)) {
    if (value === false || value === undefined) {
      continue;
    }

    if (value === true) {
      fields.push(t.field({ name: key }));
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const nested = value as {
        select?: Record<string, unknown>;
        first?: number;
        filter?: Record<string, unknown>;
        orderBy?: string[];
        connection?: boolean;
      };

      if (!nested.select || typeof nested.select !== 'object') {
        throw new Error(
          `Invalid selection for field "${key}": nested selections must include a "select" object.`,
        );
      }

      const relatedEntityType = entityConnections?.[key];
      const nestedSelections = buildSelections(
        nested.select,
        connectionFieldsMap,
        relatedEntityType,
      );
      const isConnection =
        nested.connection === true ||
        nested.first !== undefined ||
        nested.filter !== undefined ||
        relatedEntityType !== undefined;
      const args = buildArgs([
        buildOptionalArg('first', nested.first),
        nested.filter
          ? t.argument({
              name: 'filter',
              value: buildValueAst(nested.filter),
            })
          : null,
        buildEnumListArg('orderBy', nested.orderBy),
      ]);

      if (isConnection) {
        fields.push(
          t.field({
            name: key,
            args,
            selectionSet: t.selectionSet({
              selections: buildConnectionSelections(nestedSelections),
            }),
          }),
        );
      } else {
        fields.push(
          t.field({
            name: key,
            args,
            selectionSet: t.selectionSet({ selections: nestedSelections }),
          }),
        );
      }
    }
  }

  return fields;
}

// ============================================================================
// Document Builders
// ============================================================================

export function buildFindManyDocument<TSelect, TWhere>(
  operationName: string,
  queryField: string,
  select: TSelect,
  args: {
    where?: TWhere;
    orderBy?: string[];
    first?: number;
    last?: number;
    after?: string;
    before?: string;
    offset?: number;
  },
  filterTypeName: string,
  orderByTypeName: string,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  const variableDefinitions: VariableDefinitionNode[] = [];
  const queryArgs: ArgumentNode[] = [];
  const variables: Record<string, unknown> = {};

  addVariable(
    {
      varName: 'where',
      argName: 'filter',
      typeName: filterTypeName,
      value: args.where,
    },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    {
      varName: 'orderBy',
      typeName: '[' + orderByTypeName + '!]',
      value: args.orderBy?.length ? args.orderBy : undefined,
    },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    { varName: 'first', typeName: 'Int', value: args.first },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    { varName: 'last', typeName: 'Int', value: args.last },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    { varName: 'after', typeName: 'Cursor', value: args.after },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    { varName: 'before', typeName: 'Cursor', value: args.before },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    { varName: 'offset', typeName: 'Int', value: args.offset },
    variableDefinitions,
    queryArgs,
    variables,
  );

  const document = t.document({
    definitions: [
      t.operationDefinition({
        operation: OP_QUERY,
        name: operationName + 'Query',
        variableDefinitions: variableDefinitions.length
          ? variableDefinitions
          : undefined,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: queryField,
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

  return { document: print(document), variables };
}

export function buildFindFirstDocument<TSelect, TWhere>(
  operationName: string,
  queryField: string,
  select: TSelect,
  args: { where?: TWhere },
  filterTypeName: string,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  const variableDefinitions: VariableDefinitionNode[] = [];
  const queryArgs: ArgumentNode[] = [];
  const variables: Record<string, unknown> = {};

  // Always add first: 1 for findFirst
  addVariable(
    { varName: 'first', typeName: 'Int', value: 1 },
    variableDefinitions,
    queryArgs,
    variables,
  );
  addVariable(
    {
      varName: 'where',
      argName: 'filter',
      typeName: filterTypeName,
      value: args.where,
    },
    variableDefinitions,
    queryArgs,
    variables,
  );

  const document = t.document({
    definitions: [
      t.operationDefinition({
        operation: OP_QUERY,
        name: operationName + 'Query',
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: queryField,
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

  return { document: print(document), variables };
}

export function buildCreateDocument<TSelect, TData>(
  operationName: string,
  mutationField: string,
  entityField: string,
  select: TSelect,
  data: TData,
  inputTypeName: string,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  return {
    document: buildInputMutationDocument({
      operationName,
      mutationField,
      inputTypeName,
      resultSelections: [
        t.field({
          name: entityField,
          selectionSet: t.selectionSet({ selections }),
        }),
      ],
    }),
    variables: {
      input: {
        [entityField]: data,
      },
    },
  };
}

export function buildUpdateDocument<
  TSelect,
  TWhere extends { id: string },
  TData,
>(
  operationName: string,
  mutationField: string,
  entityField: string,
  select: TSelect,
  where: TWhere,
  data: TData,
  inputTypeName: string,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  return {
    document: buildInputMutationDocument({
      operationName,
      mutationField,
      inputTypeName,
      resultSelections: [
        t.field({
          name: entityField,
          selectionSet: t.selectionSet({ selections }),
        }),
      ],
    }),
    variables: {
      input: {
        id: where.id,
        patch: data,
      },
    },
  };
}

export function buildUpdateByPkDocument<TSelect, TData>(
  operationName: string,
  mutationField: string,
  entityField: string,
  select: TSelect,
  id: string | number,
  data: TData,
  inputTypeName: string,
  idFieldName: string,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  return {
    document: buildInputMutationDocument({
      operationName,
      mutationField,
      inputTypeName,
      resultSelections: [
        t.field({
          name: entityField,
          selectionSet: t.selectionSet({ selections }),
        }),
      ],
    }),
    variables: {
      input: {
        [idFieldName]: id,
        patch: data,
      },
    },
  };
}

export function buildFindOneDocument<TSelect>(
  operationName: string,
  queryField: string,
  id: string | number,
  select: TSelect,
  idArgName: string,
  idTypeName: string,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const selections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: idArgName }),
      type: parseType(idTypeName),
    }),
  ];

  const queryArgs: ArgumentNode[] = [
    t.argument({
      name: idArgName,
      value: t.variable({ name: idArgName }),
    }),
  ];

  const document = t.document({
    definitions: [
      t.operationDefinition({
        operation: OP_QUERY,
        name: operationName + 'Query',
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: queryField,
              args: queryArgs,
              selectionSet: t.selectionSet({ selections }),
            }),
          ],
        }),
      }),
    ],
  });

  return {
    document: print(document),
    variables: { [idArgName]: id },
  };
}

export function buildDeleteDocument<
  TWhere extends { id: string },
  TSelect = undefined,
>(
  operationName: string,
  mutationField: string,
  entityField: string,
  where: TWhere,
  inputTypeName: string,
  select?: TSelect,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const entitySelections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  return {
    document: buildInputMutationDocument({
      operationName,
      mutationField,
      inputTypeName,
      resultSelections: [
        t.field({
          name: entityField,
          selectionSet: t.selectionSet({
            selections: entitySelections,
          }),
        }),
      ],
    }),
    variables: {
      input: {
        id: where.id,
      },
    },
  };
}

export function buildDeleteByPkDocument<TSelect = undefined>(
  operationName: string,
  mutationField: string,
  entityField: string,
  id: string | number,
  inputTypeName: string,
  idFieldName: string,
  select?: TSelect,
  connectionFieldsMap?: Record<string, Record<string, string>>,
): { document: string; variables: Record<string, unknown> } {
  const entitySelections = select
    ? buildSelections(
        select as Record<string, unknown>,
        connectionFieldsMap,
        operationName,
      )
    : [t.field({ name: 'id' })];

  return {
    document: buildInputMutationDocument({
      operationName,
      mutationField,
      inputTypeName,
      resultSelections: [
        t.field({
          name: entityField,
          selectionSet: t.selectionSet({ selections: entitySelections }),
        }),
      ],
    }),
    variables: {
      input: {
        [idFieldName]: id,
      },
    },
  };
}

export function buildCustomDocument<TSelect, TArgs>(
  operationType: 'query' | 'mutation',
  operationName: string,
  fieldName: string,
  select: TSelect,
  args: TArgs,
  variableDefinitions: Array<{ name: string; type: string }>,
  connectionFieldsMap?: Record<string, Record<string, string>>,
  entityType?: string,
): { document: string; variables: Record<string, unknown> } {
  let actualSelect: TSelect = select;
  let isConnection = false;

  if (isCustomSelectionWrapper(select)) {
    actualSelect = select.select as TSelect;
    isConnection = select.connection === true;
  }

  const selections = actualSelect
    ? buildSelections(
        actualSelect as Record<string, unknown>,
        connectionFieldsMap,
        entityType,
      )
    : [];

  const variableDefs = variableDefinitions.map((definition) =>
    t.variableDefinition({
      variable: t.variable({ name: definition.name }),
      type: parseType(definition.type),
    }),
  );
  const fieldArgs = variableDefinitions.map((definition) =>
    t.argument({
      name: definition.name,
      value: t.variable({ name: definition.name }),
    }),
  );

  const fieldSelections = isConnection
    ? buildConnectionSelections(selections)
    : selections;

  const document = t.document({
    definitions: [
      t.operationDefinition({
        operation: operationType === 'mutation' ? OP_MUTATION : OP_QUERY,
        name: operationName,
        variableDefinitions: variableDefs.length ? variableDefs : undefined,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: fieldName,
              args: fieldArgs.length ? fieldArgs : undefined,
              selectionSet: fieldSelections.length
                ? t.selectionSet({ selections: fieldSelections })
                : undefined,
            }),
          ],
        }),
      }),
    ],
  });

  return {
    document: print(document),
    variables: (args ?? {}) as Record<string, unknown>,
  };
}

function isCustomSelectionWrapper(
  value: unknown,
): value is { select: Record<string, unknown>; connection?: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  if (!keys.includes('select') || !keys.includes('connection')) {
    return false;
  }

  if (keys.some((key) => key !== 'select' && key !== 'connection')) {
    return false;
  }

  return (
    !!record.select &&
    typeof record.select === 'object' &&
    !Array.isArray(record.select)
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildArgs(args: Array<ArgumentNode | null>): ArgumentNode[] {
  return args.filter((arg): arg is ArgumentNode => arg !== null);
}

function buildOptionalArg(
  name: string,
  value: number | string | undefined,
): ArgumentNode | null {
  if (value === undefined) {
    return null;
  }
  const valueNode =
    typeof value === 'number'
      ? t.intValue({ value: value.toString() })
      : t.stringValue({ value });
  return t.argument({ name, value: valueNode });
}

function buildEnumListArg(
  name: string,
  values: string[] | undefined,
): ArgumentNode | null {
  if (!values || values.length === 0) {
    return null;
  }
  return t.argument({
    name,
    value: t.listValue({
      values: values.map((value) => buildEnumValue(value)),
    }),
  });
}

function buildEnumValue(value: string): EnumValueNode {
  return {
    kind: ENUM_VALUE_KIND,
    value,
  };
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

interface VariableSpec {
  varName: string;
  argName?: string;
  typeName: string;
  value: unknown;
}

interface InputMutationConfig {
  operationName: string;
  mutationField: string;
  inputTypeName: string;
  resultSelections: FieldNode[];
}

function buildInputMutationDocument(config: InputMutationConfig): string {
  const document = t.document({
    definitions: [
      t.operationDefinition({
        operation: OP_MUTATION,
        name: config.operationName + 'Mutation',
        variableDefinitions: [
          t.variableDefinition({
            variable: t.variable({ name: 'input' }),
            type: parseType(config.inputTypeName + '!'),
          }),
        ],
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: config.mutationField,
              args: [
                t.argument({
                  name: 'input',
                  value: t.variable({ name: 'input' }),
                }),
              ],
              selectionSet: t.selectionSet({
                selections: config.resultSelections,
              }),
            }),
          ],
        }),
      }),
    ],
  });
  return print(document);
}

function addVariable(
  spec: VariableSpec,
  definitions: VariableDefinitionNode[],
  args: ArgumentNode[],
  variables: Record<string, unknown>,
): void {
  if (spec.value === undefined) return;

  definitions.push(
    t.variableDefinition({
      variable: t.variable({ name: spec.varName }),
      type: parseType(spec.typeName),
    }),
  );
  args.push(
    t.argument({
      name: spec.argName ?? spec.varName,
      value: t.variable({ name: spec.varName }),
    }),
  );
  variables[spec.varName] = spec.value;
}

function buildValueAst(
  value: unknown,
):
  | ReturnType<typeof t.stringValue>
  | ReturnType<typeof t.intValue>
  | ReturnType<typeof t.floatValue>
  | ReturnType<typeof t.booleanValue>
  | ReturnType<typeof t.listValue>
  | ReturnType<typeof t.objectValue>
  | ReturnType<typeof t.nullValue>
  | EnumValueNode {
  if (value === null) {
    return t.nullValue();
  }

  if (typeof value === 'boolean') {
    return t.booleanValue({ value });
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? t.intValue({ value: value.toString() })
      : t.floatValue({ value: value.toString() });
  }

  if (typeof value === 'string') {
    return t.stringValue({ value });
  }

  if (Array.isArray(value)) {
    return t.listValue({
      values: value.map((item) => buildValueAst(item)),
    });
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return t.objectValue({
      fields: Object.entries(obj).map(([key, val]) =>
        t.objectField({
          name: key,
          value: buildValueAst(val),
        }),
      ),
    });
  }

  throw new Error('Unsupported value type: ' + typeof value);
}
