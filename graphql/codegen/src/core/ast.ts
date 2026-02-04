import * as t from 'gql-ast';
import { OperationTypeNode } from 'gql-ast';
import type {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  TypeNode,
  ValueNode,
  VariableDefinitionNode,
} from 'graphql';
import { camelize, singularize } from 'inflekt';


import { getCustomAst } from './custom-ast';
import type {
  ASTFunctionParams,
  QueryFieldSelection,
  MutationASTParams,
  NestedProperties,
  ObjectArrayItem,
  QueryProperty,
} from './types';

const NON_MUTABLE_PROPS = ['createdAt', 'createdBy', 'updatedAt', 'updatedBy'];

const objectToArray = (
  obj: Record<string, QueryProperty>
): ObjectArrayItem[] =>
  Object.keys(obj).map((k) => ({
    key: k,
    name: obj[k].name || k,
    type: obj[k].type,
    isNotNull: obj[k].isNotNull,
    isArray: obj[k].isArray,
    isArrayNotNull: obj[k].isArrayNotNull,
    properties: obj[k].properties,
  }));

interface CreateGqlMutationParams {
  operationName: string;
  mutationName: string;
  selectArgs: ArgumentNode[];
  selections: FieldNode[];
  variableDefinitions: VariableDefinitionNode[];
  modelName: string;
  useModel?: boolean;
}

const createGqlMutation = ({
  operationName,
  mutationName,
  selectArgs,
  selections,
  variableDefinitions,
  modelName,
  useModel = true,
}: CreateGqlMutationParams): DocumentNode => {
  const opSel: FieldNode[] = !modelName
    ? [
        t.field({
          name: operationName,
          args: selectArgs,
          selectionSet: t.selectionSet({ selections }),
        }),
      ]
    : [
        t.field({
          name: operationName,
          args: selectArgs,
          selectionSet: t.selectionSet({
            selections: useModel
              ? [
                  t.field({
                    name: modelName,
                    selectionSet: t.selectionSet({ selections }),
                  }),
                ]
              : selections,
          }),
        }),
      ];

  return t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: mutationName,
        variableDefinitions,
        selectionSet: t.selectionSet({ selections: opSel }),
      }),
    ],
  });
};

export const getAll = ({
  queryName,
  operationName,
  selection,
}: ASTFunctionParams): DocumentNode => {
  const selections = getSelections(selection);

  const opSel: FieldNode[] = [
    t.field({
      name: operationName,
      selectionSet: t.selectionSet({
        selections: [
          t.field({
            name: 'totalCount',
          }),
          t.field({
            name: 'nodes',
            selectionSet: t.selectionSet({ selections }),
          }),
        ],
      }),
    }),
  ];

  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: queryName,
        selectionSet: t.selectionSet({ selections: opSel }),
      }),
    ],
  });

  return ast;
};

export const getCount = ({
  queryName,
  operationName,
  query,
}: Omit<ASTFunctionParams, 'selection'>): DocumentNode => {
  const Singular = query.model;
  const Filter = `${Singular}Filter`;
  const Condition = `${Singular}Condition`;

  const variableDefinitions: VariableDefinitionNode[] = [
    t.variableDefinition({
      variable: t.variable({ name: 'condition' }),
      type: t.namedType({ type: Condition }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'filter' }),
      type: t.namedType({ type: Filter }),
    }),
  ];

  const args: ArgumentNode[] = [
    t.argument({ name: 'condition', value: t.variable({ name: 'condition' }) }),
    t.argument({ name: 'filter', value: t.variable({ name: 'filter' }) }),
  ];

  // PostGraphile supports totalCount through connections
  const opSel: FieldNode[] = [
    t.field({
      name: operationName,
      args,
      selectionSet: t.selectionSet({
        selections: [
          t.field({
            name: 'totalCount',
          }),
        ],
      }),
    }),
  ];

  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: queryName,
        variableDefinitions,
        selectionSet: t.selectionSet({ selections: opSel }),
      }),
    ],
  });

  return ast;
};

export const getMany = ({
  builder,
  queryName,
  operationName,
  query,
  selection,
}: ASTFunctionParams): DocumentNode => {
  const Singular = query.model;
  const Plural =
    operationName.charAt(0).toUpperCase() + operationName.slice(1);
  const Condition = `${Singular}Condition`;
  const Filter = `${Singular}Filter`;
  const OrderBy = `${Plural}OrderBy`;
  const selections = getSelections(selection);

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
      variable: t.variable({ name: 'after' }),
      type: t.namedType({ type: 'Cursor' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'before' }),
      type: t.namedType({ type: 'Cursor' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'offset' }),
      type: t.namedType({ type: 'Int' }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'condition' }),
      type: t.namedType({ type: Condition }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'filter' }),
      type: t.namedType({ type: Filter }),
    }),
    t.variableDefinition({
      variable: t.variable({ name: 'orderBy' }),
      type: t.listType({
        type: t.nonNullType({ type: t.namedType({ type: OrderBy }) }),
      }),
    }),
  ];

  const args: ArgumentNode[] = [
    t.argument({ name: 'first', value: t.variable({ name: 'first' }) }),
    t.argument({ name: 'last', value: t.variable({ name: 'last' }) }),
    t.argument({ name: 'offset', value: t.variable({ name: 'offset' }) }),
    t.argument({ name: 'after', value: t.variable({ name: 'after' }) }),
    t.argument({ name: 'before', value: t.variable({ name: 'before' }) }),
    t.argument({
      name: 'condition',
      value: t.variable({ name: 'condition' }),
    }),
    t.argument({ name: 'filter', value: t.variable({ name: 'filter' }) }),
    t.argument({ name: 'orderBy', value: t.variable({ name: 'orderBy' }) }),
  ];

  const pageInfoFields: FieldNode[] = [
    t.field({ name: 'hasNextPage' }),
    t.field({ name: 'hasPreviousPage' }),
    t.field({ name: 'endCursor' }),
    t.field({ name: 'startCursor' }),
  ];

  const dataField: FieldNode = builder?._edges
    ? t.field({
        name: 'edges',
        selectionSet: t.selectionSet({
          selections: [
            t.field({ name: 'cursor' }),
            t.field({
              name: 'node',
              selectionSet: t.selectionSet({ selections }),
            }),
          ],
        }),
      })
    : t.field({
        name: 'nodes',
        selectionSet: t.selectionSet({ selections }),
      });

  const connectionFields: FieldNode[] = [
    t.field({ name: 'totalCount' }),
    t.field({
      name: 'pageInfo',
      selectionSet: t.selectionSet({ selections: pageInfoFields }),
    }),
    dataField,
  ];

  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: queryName,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: operationName,
              args,
              selectionSet: t.selectionSet({ selections: connectionFields }),
            }),
          ],
        }),
      }),
    ],
  });

  return ast;
};

export const getOne = ({
  queryName,
  operationName,
  query,
  selection,
}: ASTFunctionParams): DocumentNode => {
  const variableDefinitions: VariableDefinitionNode[] = Object.keys(
    query.properties
  )
    .map((key) => ({ key, ...query.properties[key] }))
    .filter((field) => field.isNotNull)
    .map((field) => {
      const {
        key: fieldName,
        type: fieldType,
        isNotNull,
        isArray,
        isArrayNotNull,
      } = field;
      let type: TypeNode = t.namedType({ type: fieldType });
      if (isNotNull) type = t.nonNullType({ type });
      if (isArray) {
        type = t.listType({ type });
        if (isArrayNotNull) type = t.nonNullType({ type });
      }
      return t.variableDefinition({
        variable: t.variable({ name: fieldName }),
        type,
      });
    });

  const props = objectToArray(query.properties);

  const selectArgs: ArgumentNode[] = props
    .filter((field) => field.isNotNull)
    .map((field) => {
      return t.argument({
        name: field.name,
        value: t.variable({ name: field.name }),
      });
    });

  const selections = getSelections(selection);

  const opSel: FieldNode[] = [
    t.field({
      name: operationName,
      args: selectArgs,
      selectionSet: t.selectionSet({ selections }),
    }),
  ];

  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: queryName,
        variableDefinitions,
        selectionSet: t.selectionSet({ selections: opSel }),
      }),
    ],
  });
  return ast;
};

export const createOne = ({
  mutationName,
  operationName,
  mutation,
  selection,
}: MutationASTParams): DocumentNode => {
  if (!mutation.properties?.input?.properties) {
    throw new Error(`No input field for mutation: ${mutationName}`);
  }

  const modelName = camelize(
    [singularize(mutation.model)].join('_'),
    true
  );

  const inputProperties = mutation.properties.input
    .properties as NestedProperties;
  const modelProperties = inputProperties[modelName] as QueryProperty;

  if (!modelProperties.properties) {
    throw new Error(`No properties found for model: ${modelName}`);
  }

  const allAttrs = objectToArray(
    modelProperties.properties as Record<string, QueryProperty>
  );
  const attrs = allAttrs.filter(
    (field) => !NON_MUTABLE_PROPS.includes(field.name)
  );

  const variableDefinitions = getCreateVariablesAst(attrs);

  const selectArgs: ArgumentNode[] = [
    t.argument({
      name: 'input',
      value: t.objectValue({
        fields: [
          t.objectField({
            name: modelName,
            value: t.objectValue({
              fields: attrs.map((field) =>
                t.objectField({
                  name: field.name,
                  value: t.variable({ name: field.name }),
                })
              ),
            }),
          }),
        ],
      }),
    }),
  ];

  const selections = selection
    ? getSelections(selection)
    : allAttrs.map((field) => t.field({ name: field.name }));

  const ast = createGqlMutation({
    operationName,
    mutationName,
    selectArgs,
    selections,
    variableDefinitions,
    modelName,
  });

  return ast;
};

export const patchOne = ({
  mutationName,
  operationName,
  mutation,
  selection,
}: MutationASTParams): DocumentNode => {
  if (!mutation.properties?.input?.properties) {
    throw new Error(`No input field for mutation: ${mutationName}`);
  }

  const modelName = camelize(
    [singularize(mutation.model)].join('_'),
    true
  );

  const inputProperties = mutation.properties.input
    .properties as NestedProperties;
  const patchProperties = inputProperties['patch'] as QueryProperty;

  const allAttrs = patchProperties?.properties
    ? objectToArray(patchProperties.properties as Record<string, QueryProperty>)
    : [];

  const patchAttrs = allAttrs.filter(
    (prop) => !NON_MUTABLE_PROPS.includes(prop.name)
  );
  const patchByAttrs = objectToArray(
    inputProperties as Record<string, QueryProperty>
  ).filter((n) => n.name !== 'patch');
  const patchers = patchByAttrs.map((p) => p.name);

  const variableDefinitions = getUpdateVariablesAst(patchAttrs, patchers);

  const selectArgs: ArgumentNode[] = [
    t.argument({
      name: 'input',
      value: t.objectValue({
        fields: [
          ...patchByAttrs.map((field) =>
            t.objectField({
              name: field.name,
              value: t.variable({ name: field.name }),
            })
          ),
          t.objectField({
            name: 'patch',
            value: t.objectValue({
              fields: patchAttrs
                .filter((field) => !patchers.includes(field.name))
                .map((field) =>
                  t.objectField({
                    name: field.name,
                    value: t.variable({ name: field.name }),
                  })
                ),
            }),
          }),
        ],
      }),
    }),
  ];

  const selections = selection
    ? getSelections(selection)
    : allAttrs.map((field) => t.field({ name: field.name }));

  const ast = createGqlMutation({
    operationName,
    mutationName,
    selectArgs,
    selections,
    variableDefinitions,
    modelName,
  });

  return ast;
};

export const deleteOne = ({
  mutationName,
  operationName,
  mutation,
}: Omit<MutationASTParams, 'selection'>): DocumentNode => {
  if (!mutation.properties?.input?.properties) {
    throw new Error(`No input field for mutation: ${mutationName}`);
  }

  const modelName = camelize(
    [singularize(mutation.model)].join('_'),
    true
  );

  const inputProperties = mutation.properties.input
    .properties as NestedProperties;
  const deleteAttrs = objectToArray(
    inputProperties as Record<string, QueryProperty>
  );

  const variableDefinitions: VariableDefinitionNode[] = deleteAttrs.map(
    (field) => {
      const { name: fieldName, type: fieldType, isNotNull, isArray } = field;
      let type: TypeNode = t.namedType({ type: fieldType });
      if (isNotNull) type = t.nonNullType({ type });
      if (isArray) {
        type = t.listType({ type });
        // no need to check isArrayNotNull since we need this field for deletion
        type = t.nonNullType({ type });
      }
      return t.variableDefinition({
        variable: t.variable({ name: fieldName }),
        type,
      });
    }
  );

  const selectArgs: ArgumentNode[] = [
    t.argument({
      name: 'input',
      value: t.objectValue({
        fields: deleteAttrs.map((f) =>
          t.objectField({
            name: f.name,
            value: t.variable({ name: f.name }),
          })
        ),
      }),
    }),
  ];

  // so we can support column select grants plugin
  const selections: FieldNode[] = [t.field({ name: 'clientMutationId' })];
  const ast = createGqlMutation({
    operationName,
    mutationName,
    selectArgs,
    selections,
    useModel: false,
    variableDefinitions,
    modelName,
  });

  return ast;
};

export function getSelections(selection: QueryFieldSelection[] = []): FieldNode[] {
  const selectionAst = (field: string | QueryFieldSelection): FieldNode => {
    if (typeof field === 'string') {
      return t.field({ name: field });
    }
    // Check if fieldDefn has MetaField shape (has type.pgType)
    const fieldDefn = field.fieldDefn;
    if (
      fieldDefn &&
      'type' in fieldDefn &&
      fieldDefn.type &&
      typeof fieldDefn.type === 'object' &&
      'pgType' in fieldDefn.type
    ) {
      const customAst = getCustomAst(
        fieldDefn as { name: string; type: { gqlType: string; pgType: string; isArray: boolean } }
      );
      if (customAst) return customAst;
    }
    return t.field({ name: field.name });
  };

  return selection
    .map((selectionDefn): FieldNode | null => {
      if (selectionDefn.isObject) {
        const { name, selection, variables = {}, isBelongTo } = selectionDefn;

        const args: ArgumentNode[] = Object.entries(variables).reduce(
          (acc: ArgumentNode[], variable) => {
            const [argName, argValue] = variable;
            const argAst = t.argument({
              name: argName,
              value: getComplexValueAst(argValue),
            });
            return argAst ? [...acc, argAst] : acc;
          },
          []
        );

        const subSelections =
          selection?.map((field) => selectionAst(field)) || [];

        const selectionSet = isBelongTo
          ? t.selectionSet({ selections: subSelections })
          : t.selectionSet({
              selections: [
                t.field({ name: 'totalCount' }),
                t.field({
                  name: 'nodes',
                  selectionSet: t.selectionSet({ selections: subSelections }),
                }),
              ],
            });

        return t.field({
          name,
          args,
          selectionSet,
        });
      } else {
        return selectionAst(selectionDefn);
      }
    })
    .filter((node): node is FieldNode => node !== null);
}

function getComplexValueAst(value: unknown): ValueNode {
  // Handle null
  if (value === null) {
    return t.nullValue();
  }

  // Handle primitives
  if (typeof value === 'boolean') {
    return t.booleanValue({ value });
  }

  if (typeof value === 'number') {
    return t.intValue({ value: value.toString() });
  }

  if (typeof value === 'string') {
    return t.stringValue({ value });
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return t.listValue({
      values: value.map((item) => getComplexValueAst(item)),
    });
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return t.objectValue({
      fields: Object.entries(obj).map(([key, val]) =>
        t.objectField({
          name: key,
          value: getComplexValueAst(val),
        })
      ),
    });
  }

  throw new Error(`Unsupported value type: ${typeof value}`);
}

function getCreateVariablesAst(
  attrs: ObjectArrayItem[]
): VariableDefinitionNode[] {
  return attrs.map((field) => {
    const {
      name: fieldName,
      type: fieldType,
      isNotNull,
      isArray,
      isArrayNotNull,
    } = field;
    let type: TypeNode = t.namedType({ type: fieldType });
    if (isNotNull) type = t.nonNullType({ type });
    if (isArray) {
      type = t.listType({ type });
      if (isArrayNotNull) type = t.nonNullType({ type });
    }
    return t.variableDefinition({
      variable: t.variable({ name: fieldName }),
      type,
    });
  });
}

function getUpdateVariablesAst(
  attrs: ObjectArrayItem[],
  patchers: string[]
): VariableDefinitionNode[] {
  const patchVariables: VariableDefinitionNode[] = attrs
    .filter((field) => !patchers.includes(field.name))
    .map((field) => {
      const { name: fieldName, type: fieldType, isArray, isArrayNotNull } =
        field;
      let type: TypeNode = t.namedType({ type: fieldType });
      if (isArray) {
        type = t.listType({ type });
        if (isArrayNotNull) type = t.nonNullType({ type });
      }
      return t.variableDefinition({
        variable: t.variable({ name: fieldName }),
        type,
      });
    });

  const patcherVariables: VariableDefinitionNode[] = patchers.map((patcher) => {
    return t.variableDefinition({
      variable: t.variable({ name: patcher }),
      type: t.nonNullType({ type: t.namedType({ type: 'String' }) }),
    });
  });

  return [...patchVariables, ...patcherVariables];
}
