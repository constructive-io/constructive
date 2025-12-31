// TODO: use inflection for all the things
// const { singularize } = require('inflection');
import * as t from 'gql-ast';
import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  TypeNode,
  VariableDefinitionNode,
} from 'graphql';
// @ts-ignore
const inflection: any = require('inflection');

const NON_MUTABLE_PROPS = [
  'id',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
];

const objectToArray = (obj: Record<string, any>): { name: string; [key: string]: any }[] =>
  Object.keys(obj).map((k) => ({ name: k, ...obj[k] }));

type TypeIndex = { byName: Record<string, any>; getInputFieldType: (typeName: string, fieldName: string) => any };

function refToTypeNode(ref: any, overrides?: Record<string, string>): TypeNode | null {
  if (!ref) return null as any;
  if (ref.kind === 'NON_NULL') {
    const inner = refToTypeNode(ref.ofType, overrides) as any;
    return t.nonNullType({ type: inner });
  }
  if (ref.kind === 'LIST') {
    const inner = refToTypeNode(ref.ofType, overrides) as any;
    return t.listType({ type: inner });
  }
  const name = (overrides && overrides[ref.name]) || ref.name;
  return t.namedType({ type: name });
}

function resolveTypeName(name: string, type: any, overrides?: Record<string, string>): string {
  if (typeof type === 'string') {
    const base = type;
    const mapped = overrides && overrides[base];
    return mapped || base;
  }
  if (type && typeof type === 'object') {
    if (typeof (type as any).name === 'string' && (type as any).name.length > 0) return (type as any).name;
    let t: any = type;
    while (t && typeof t === 'object' && t.ofType) t = t.ofType;
    if (t && typeof t.name === 'string' && t.name.length > 0) {
      const base = t.name as string;
      const mapped = overrides && overrides[base];
      return mapped || base;
    }
  }
  return 'JSON';
}

function refToNamedTypeName(ref: any): string | null {
  let r = ref;
  while (r && (r.kind === 'NON_NULL' || r.kind === 'LIST')) r = r.ofType;
  return r && r.name ? r.name : null;
}

function extractNamedTypeName(node: any): string | null {
  let n = node;
  while (n && !n.name && n.type) n = n.type;
  return n && n.name ? n.name : null;
}

function singularModel(name: string): string {
  return inflection.singularize(name);
}

interface CreateGqlMutationArgs {
  operationName: string;
  mutationName: string;
  selectArgs: ArgumentNode[];
  selections: FieldNode[];
  variableDefinitions: VariableDefinitionNode[];
  modelName?: string;
  useModel?: boolean;
}

export const createGqlMutation = ({
  operationName,
  mutationName,
  selectArgs,
  variableDefinitions,
  modelName,
  selections,
  useModel = true,
}: CreateGqlMutationArgs): DocumentNode => {

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
        operation: 'mutation',
        name: mutationName,
        variableDefinitions,
        selectionSet: t.selectionSet({ selections: opSel }),
      }),
    ],
  });
};

export interface GetManyArgs {
  operationName: string;
  query: any; // You can type this more specifically if you know its structure
  fields: string[];
}

export interface GetManyResult {
  name: string;
  ast: DocumentNode;
}

export const getMany = ({
  operationName,
  query,
  fields,
}: GetManyArgs): GetManyResult => {
  const queryName = inflection.camelize(
    ['get', inflection.underscore(operationName), 'query', 'all'].join('_'),
    true
  );

  const selections: FieldNode[] = getSelections(query, fields);

  const opSel: FieldNode[] = [
    t.field({
      name: operationName,
      selectionSet: t.selectionSet({
        selections: [
          t.field({ name: 'totalCount' }),
          t.field({
            name: 'pageInfo',
            selectionSet: t.selectionSet({
              selections: [
                t.field({ name: 'hasNextPage' }),
                t.field({ name: 'hasPreviousPage' }),
                t.field({ name: 'endCursor' }),
                t.field({ name: 'startCursor' }),
              ],
            }),
          }),
          t.field({
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
          }),
        ],
      }),
    }),
  ];

  const ast: DocumentNode = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: queryName,
        selectionSet: t.selectionSet({ selections: opSel }),
      }),
    ],
  });

  return { name: queryName, ast };
};

export interface GetManyPaginatedEdgesArgs {
  operationName: string;
  query: GqlField;
  fields: string[];
}

export interface GetManyPaginatedEdgesResult {
  name: string;
  ast: DocumentNode;
}

export const getManyPaginatedEdges = ({
  operationName,
  query,
  fields,
}: GetManyPaginatedEdgesArgs): GetManyPaginatedEdgesResult => {
  const queryName = inflection.camelize(
    ['get', inflection.underscore(operationName), 'paginated'].join('_'),
    true
  );

  const Plural = operationName.charAt(0).toUpperCase() + operationName.slice(1);
  const Singular = query.model;
  const Condition = `${Singular}Condition`;
  const Filter = `${Singular}Filter`;
  const OrderBy = `${Plural}OrderBy`;

  const selections: FieldNode[] = getSelections(query, fields);

  const variableDefinitions: VariableDefinitionNode[] = [
    'first',
    'last',
    'offset',
    'after',
    'before',
  ].map((name) =>
    t.variableDefinition({
      variable: t.variable({ name }),
      type: t.namedType({ type: name === 'after' || name === 'before' ? 'Cursor' : 'Int' }),
    })
  );

  variableDefinitions.push(
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
        type: t.nonNullType({
          type: t.namedType({ type: OrderBy }),
        }),
      }),
    })
  );

  const args = [
    'first',
    'last',
    'offset',
    'after',
    'before',
    'condition',
    'filter',
    'orderBy',
  ].map((name) =>
    t.argument({
      name,
      value: t.variable({ name }),
    })
  );

  const ast: DocumentNode = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: queryName,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: operationName,
              args,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({ name: 'totalCount' }),
                  t.field({
                    name: 'pageInfo',
                    selectionSet: t.selectionSet({
                      selections: [
                        t.field({ name: 'hasNextPage' }),
                        t.field({ name: 'hasPreviousPage' }),
                        t.field({ name: 'endCursor' }),
                        t.field({ name: 'startCursor' }),
                      ],
                    }),
                  }),
                  t.field({
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
                  }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });

  return { name: queryName, ast };
};

export interface GetManyPaginatedNodesArgs {
  operationName: string;
  query: GqlField;
  fields: string[];
}

export interface GetManyPaginatedNodesResult {
  name: string;
  ast: DocumentNode;
}

export const getManyPaginatedNodes = ({
  operationName,
  query,
  fields,
}: GetManyPaginatedNodesArgs): GetManyPaginatedNodesResult => {
  const queryName = inflection.camelize(
    ['get', inflection.underscore(operationName), 'query'].join('_'),
    true
  );

  const Singular = query.model;
  const Plural = operationName.charAt(0).toUpperCase() + operationName.slice(1);
  const Condition = `${Singular}Condition`;
  const Filter = `${Singular}Filter`;
  const OrderBy = `${Plural}OrderBy`;

  const selections: FieldNode[] = getSelections(query, fields);

  const variableDefinitions: VariableDefinitionNode[] = [
    'first',
    'last',
    'after',
    'before',
    'offset',
  ].map((name) =>
    t.variableDefinition({
      variable: t.variable({ name }),
      type: t.namedType({ type: name === 'after' || name === 'before' ? 'Cursor' : 'Int' }),
    })
  );

  variableDefinitions.push(
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
        type: t.nonNullType({
          type: t.namedType({ type: OrderBy }),
        }),
      }),
    })
  );

  const args: ArgumentNode[] = [
    'first',
    'last',
    'offset',
    'after',
    'before',
    'condition',
    'filter',
    'orderBy',
  ].map((name) =>
    t.argument({
      name,
      value: t.variable({ name }),
    })
  );

  const ast: DocumentNode = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: queryName,
        variableDefinitions,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: operationName,
              args,
              selectionSet: t.selectionSet({
                selections: [
                  t.field({ name: 'totalCount' }),
                  t.field({
                    name: 'pageInfo',
                    selectionSet: t.selectionSet({
                      selections: [
                        t.field({ name: 'hasNextPage' }),
                        t.field({ name: 'hasPreviousPage' }),
                        t.field({ name: 'endCursor' }),
                        t.field({ name: 'startCursor' }),
                      ],
                    }),
                  }),
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

  return { name: queryName, ast };
};

export interface GetOrderByEnumsArgs {
  operationName: string;
  query: {
    model: string;
  };
}

export interface GetOrderByEnumsResult {
  name: string;
  ast: DocumentNode;
}

export const getOrderByEnums = ({
  operationName,
  query,
}: GetOrderByEnumsArgs): GetOrderByEnumsResult => {
  const queryName = inflection.camelize(
    ['get', inflection.underscore(operationName), 'Order', 'By', 'Enums'].join('_'),
    true
  );

  const Model = operationName.charAt(0).toUpperCase() + operationName.slice(1);
  const OrderBy = `${Model}OrderBy`;

  const ast: DocumentNode = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: queryName,
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: '__type',
              args: [
                t.argument({
                  name: 'name',
                  value: t.stringValue({ value: OrderBy }),
                }),
              ],
              selectionSet: t.selectionSet({
                selections: [
                  t.field({
                    name: 'enumValues',
                    selectionSet: t.selectionSet({
                      selections: [t.field({ name: 'name' })],
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

  return { name: queryName, ast };
};

export interface GetFragmentArgs {
  operationName: string;
  query: GqlField;
}

export interface GetFragmentResult {
  name: string;
  ast: DocumentNode;
}

export const getFragment = ({
  operationName,
  query,
}: GetFragmentArgs): GetFragmentResult => {
  const queryName = inflection.camelize(
    [inflection.underscore(query.model), 'Fragment'].join('_'),
    true
  );

  const selections: FieldNode[] = getSelections(query);

  const ast: DocumentNode = t.document({
    definitions: [
      t.fragmentDefinition({
        name: queryName,
        typeCondition: t.namedType({
          type: query.model,
        }),
        selectionSet: t.selectionSet({
          selections,
        }),
      }),
    ],
  });

  return { name: queryName, ast };
};

export interface FieldProperty {
  name: string;
  type: string;
  isNotNull?: boolean;
  isArray?: boolean;
  isArrayNotNull?: boolean;
}

export interface GetOneArgs {
  operationName: string;
  query: GqlField;
  fields: string[];
}

export interface GetOneResult {
  name: string;
  ast: DocumentNode;
}

export const getOne = ({
  operationName,
  query,
  fields,
}: GetOneArgs, typeNameOverrides?: Record<string, string>): GetOneResult => {
  const queryName = inflection.camelize(
    ['get', inflection.underscore(operationName), 'query'].join('_'),
    true
  );

  const variableDefinitions: VariableDefinitionNode[] = objectToArray(query.properties)
    .filter((field) => field.isNotNull)
    .map(({ name, type, isNotNull, isArray, isArrayNotNull }) => {
      const typeName = resolveTypeName(name, type, typeNameOverrides);
      let gqlType = t.namedType({ type: typeName }) as any;

      if (isNotNull) {
        gqlType = t.nonNullType({ type: gqlType });
      }

      if (isArray) {
        gqlType = t.listType({ type: gqlType });
        if (isArrayNotNull) {
          gqlType = t.nonNullType({ type: gqlType });
        }
      }

      return t.variableDefinition({
        variable: t.variable({ name }),
        type: gqlType,
      });
    });

  const selectArgs: ArgumentNode[] = objectToArray(query.properties)
    .filter((field) => field.isNotNull)
    .map((field) =>
      t.argument({
        name: field.name,
        value: t.variable({ name: field.name }),
      })
    );

  const selections: FieldNode[] = getSelections(query, fields);

  const opSel: FieldNode[] = [
    t.field({
      name: operationName,
      args: selectArgs,
      selectionSet: t.selectionSet({ selections }),
    }),
  ];

  const ast: DocumentNode = t.document({
    definitions: [
      t.operationDefinition({
        operation: 'query',
        name: queryName,
        variableDefinitions,
        selectionSet: t.selectionSet({ selections: opSel }),
      }),
    ],
  });

  return { name: queryName, ast };
};

export interface CreateOneArgs {
  operationName: string;
  mutation: MutationSpec;
  selection?: { mutationInputMode?: 'expanded' | 'model' | 'raw' | 'patchCollapsed'; connectionStyle?: 'nodes' | 'edges'; forceModelOutput?: boolean };
}

export interface CreateOneResult {
  name: string;
  ast: DocumentNode;
}

export const createOne = ({
  operationName,
  mutation,
  selection,
}: CreateOneArgs, typeNameOverrides?: Record<string, string>, typeIndex?: TypeIndex): CreateOneResult | undefined => {
  const mutationName = inflection.camelize(
    [inflection.underscore(operationName), 'mutation'].join('_'),
    true
  );

  if (!mutation.properties?.input?.properties) {
    console.log('no input field for mutation for ' + mutationName);
    return;
  }

  const modelName = inflection.camelize(
    [singularModel(mutation.model)].join('_'),
    true
  );

  const allAttrs = objectToArray(
    mutation.properties.input.properties[modelName].properties
  );

  const attrs = allAttrs.filter(
    (field) => field.name === 'id' ? Boolean(field.isNotNull) : !NON_MUTABLE_PROPS.includes(field.name)
  );

  const useRaw = selection?.mutationInputMode === 'raw';
  const inputTypeName = resolveTypeName('input', (mutation.properties as any)?.input?.type || (mutation.properties as any)?.input, typeNameOverrides);
  let unresolved = 0;
  let modelInputName: string | null = null;
  if (typeIndex && inputTypeName) {
    const modelRef = typeIndex.getInputFieldType(inputTypeName, modelName);
    modelInputName = refToNamedTypeName(modelRef);
  }
  const variableDefinitions: VariableDefinitionNode[] = attrs.map(
    ({ name, type, isNotNull, isArray, isArrayNotNull }) => {
      let gqlType: TypeNode | null = null as any;
      if (typeIndex && modelInputName) {
        const fieldTypeRef = typeIndex.getInputFieldType(modelInputName, name);
        const tn = refToTypeNode(fieldTypeRef, typeNameOverrides) as any;
        if (tn) gqlType = tn;
      }
      if (!gqlType) {
        const typeName = resolveTypeName(name, type, typeNameOverrides);
        gqlType = t.namedType({ type: typeName });
        if (isNotNull) {
          gqlType = t.nonNullType({ type: gqlType });
        }
        if (isArray) {
          gqlType = t.listType({ type: gqlType });
          if (isArrayNotNull) {
            gqlType = t.nonNullType({ type: gqlType });
          }
        }
      }
      const nn = extractNamedTypeName(gqlType);
      if (nn === 'JSON') unresolved++;
      return t.variableDefinition({ variable: t.variable({ name }), type: gqlType as any });
    }
  );

  const mustUseRaw = useRaw || unresolved > 0;
  const selectArgs: ArgumentNode[] = mustUseRaw
    ? [t.argument({ name: 'input', value: t.variable({ name: 'input' }) as any })]
    : [
      t.argument({
        name: 'input',
        value: t.objectValue({
          fields: [
            t.objectField({
              name: modelName,
              value: t.objectValue({
                fields: attrs.map((field) => t.objectField({ name: field.name, value: t.variable({ name: field.name }) })),
              }),
            }),
          ],
        }),
      }),
    ];

  let idExists = true;
  let availableFieldNames: string[] = [];
  if (typeIndex) {
    const typ = (typeIndex as any).byName?.[mutation.model];
    const fields = (typ && Array.isArray(typ.fields)) ? typ.fields : [];
    idExists = fields.some((f: any) => f && f.name === 'id');
    availableFieldNames = fields
      .filter((f: any) => {
        let r = f.type;
        while (r && (r.kind === 'NON_NULL' || r.kind === 'LIST')) r = r.ofType;
        const kind = r?.kind;
        return kind === 'SCALAR' || kind === 'ENUM';
      })
      .map((f: any) => f.name);
  }

  const finalFields = Array.from(new Set([...(idExists ? ['id'] : []), ...availableFieldNames]));

  const nested: FieldNode[] = (finalFields.length > 0)
    ? [t.field({
        name: modelName,
        selectionSet: t.selectionSet({ selections: finalFields.map((f) => t.field({ name: f })) }),
      })]
    : [];

  const ast: DocumentNode = createGqlMutation({
    operationName,
    mutationName,
    selectArgs,
    selections: [...nested, t.field({ name: 'clientMutationId' })],
    variableDefinitions: mustUseRaw
      ? [t.variableDefinition({ variable: t.variable({ name: 'input' }), type: t.nonNullType({ type: t.namedType({ type: inputTypeName }) }) as any })]
      : variableDefinitions,
    useModel: false,
  });

  return { name: mutationName, ast };
};

interface MutationOutput {
  name: string;
  type: {
    kind: string; // typically "SCALAR", "OBJECT", etc. from GraphQL introspection
  };
}

export interface MutationSpec {
  model: string;
  properties: {
    input?: {
      properties?: Record<string, any>;
    };
  };
  outputs?: MutationOutput[]; // ✅ Add this line

}

export interface PatchOneArgs {
  operationName: string;
  mutation: MutationSpec;
  selection?: { mutationInputMode?: 'expanded' | 'model' | 'raw' | 'patchCollapsed'; connectionStyle?: 'nodes' | 'edges'; forceModelOutput?: boolean };
}

export interface PatchOneResult {
  name: string;
  ast: DocumentNode;
}

export const patchOne = ({
  operationName,
  mutation,
  selection,
}: PatchOneArgs, typeNameOverrides?: Record<string, string>, typeIndex?: TypeIndex): PatchOneResult | undefined => {
  const mutationName = inflection.camelize(
    [inflection.underscore(operationName), 'mutation'].join('_'),
    true
  );

  if (!mutation.properties?.input?.properties) {
    console.log('no input field for mutation for ' + mutationName);
    return;
  }

  const modelName = inflection.camelize(
    [singularModel(mutation.model)].join('_'),
    true
  );

  // @ts-ignore
  const allAttrs: FieldProperty[] = objectToArray(
    mutation.properties.input.properties['patch']?.properties || {}
  );

  const patchAttrs = allAttrs.filter(
    // @ts-ignore
    (prop) => !NON_MUTABLE_PROPS.includes(prop.name)
  );

  const patchByAttrs = objectToArray(
    mutation.properties.input.properties
  ).filter((n) => n.name !== 'patch');

  const patchers = patchByAttrs.map((p) => p.name);

  const useCollapsedOpt = selection?.mutationInputMode === 'patchCollapsed';
  const ModelPascal = inflection.camelize(singularModel(mutation.model), false);
  const patchTypeName = `${ModelPascal}Patch`;
  const inputTypeName = resolveTypeName('input', (mutation.properties as any)?.input?.type || (mutation.properties as any)?.input, typeNameOverrides);
  let unresolved = 0;
  const patchAttrVarDefs: VariableDefinitionNode[] = useCollapsedOpt
    ? [
      t.variableDefinition({
        variable: t.variable({ name: 'patch' }),
        type: t.nonNullType({ type: t.namedType({ type: patchTypeName }) }) as any,
      }),
    ]
    : patchAttrs
      .filter((field) => !patchers.includes((field as any).name))
      .map(({ name, type, isArray }: any) => {
        let gqlType: TypeNode | null = null as any;
        if (typeIndex) {
          const pType = typeIndex.byName[patchTypeName];
          const f = pType && pType.inputFields && pType.inputFields.find((x: any) => x.name === name);
          if (f && f.type) gqlType = refToTypeNode(f.type, typeNameOverrides) as any;
        }
        if (!gqlType) {
          const typeName = resolveTypeName(name, type, typeNameOverrides);
          gqlType = t.namedType({ type: typeName });
          if (isArray) {
            gqlType = t.listType({ type: gqlType });
          }
          if ((patchers as any).includes(name)) {
            gqlType = t.nonNullType({ type: gqlType });
          }
        }
        const nn = extractNamedTypeName(gqlType);
        if (nn === 'JSON') unresolved++;
        return t.variableDefinition({ variable: t.variable({ name }), type: gqlType as any });
      });

  const patchByVarDefs: VariableDefinitionNode[] = patchByAttrs.map(({ name, type, isNotNull, isArray, isArrayNotNull }) => {
    let gqlType: TypeNode | null = null as any;
    if (typeIndex && inputTypeName) {
      const ref = typeIndex.getInputFieldType(inputTypeName, name);
      const tn = refToTypeNode(ref, typeNameOverrides) as any;
      if (tn) gqlType = tn;
    }
    if (!gqlType) {
      const typeName = resolveTypeName(name, type, typeNameOverrides);
      gqlType = t.namedType({ type: typeName });
      if (isNotNull) {
        gqlType = t.nonNullType({ type: gqlType });
      }
      if (isArray) {
        gqlType = t.listType({ type: gqlType });
        if (isArrayNotNull) {
          gqlType = t.nonNullType({ type: gqlType });
        }
      }
    }
    const nn = extractNamedTypeName(gqlType);
    if (nn === 'JSON') unresolved++;
    return t.variableDefinition({ variable: t.variable({ name }), type: gqlType as any });
  });

  const mustUseRaw = unresolved > 0;
  const selectArgs: ArgumentNode[] = mustUseRaw
    ? [t.argument({ name: 'input', value: t.variable({ name: 'input' }) as any })]
    : [
      t.argument({
        name: 'input',
        value: t.objectValue({
          fields: [
            ...patchByAttrs.map((field) => t.objectField({ name: field.name, value: t.variable({ name: field.name }) })),
            t.objectField({
              name: 'patch',
              value: useCollapsedOpt ? (t.variable({ name: 'patch' }) as any) : t.objectValue({
                fields: patchAttrs
                  .filter((field) => !patchers.includes((field as any).name))
                  .map((field: any) => t.objectField({ name: field.name, value: t.variable({ name: field.name }) })),
              }),
            }),
          ],
        }),
      }),
    ];

  let idExistsPatch = true;
  if (typeIndex) {
    const typ = (typeIndex as any).byName?.[mutation.model];
    const fields = (typ && Array.isArray(typ.fields)) ? typ.fields : [];
    idExistsPatch = fields.some((f: any) => f && f.name === 'id');
  }
  const shouldDropIdPatch = /Extension$/i.test(modelName) || !idExistsPatch;
  const idSelection = shouldDropIdPatch ? [] : ['id'];

  const nestedPatch: FieldNode[] = (idSelection.length > 0)
    ? [t.field({
        name: modelName,
        selectionSet: t.selectionSet({ selections: idSelection.map((f) => t.field({ name: f })) }),
      })]
    : [];

  const ast: DocumentNode = createGqlMutation({
    operationName,
    mutationName,
    selectArgs,
    selections: [...nestedPatch, t.field({ name: 'clientMutationId' })],
    variableDefinitions: mustUseRaw
      ? [t.variableDefinition({ variable: t.variable({ name: 'input' }), type: t.nonNullType({ type: t.namedType({ type: inputTypeName }) }) as any })]
      : [...patchByVarDefs, ...patchAttrVarDefs],
    useModel: false,
  });

  return { name: mutationName, ast };
};


export interface DeleteOneArgs {
  operationName: string;
  mutation: MutationSpec;
}

export interface DeleteOneResult {
  name: string;
  ast: DocumentNode;
}

export const deleteOne = ({
  operationName,
  mutation,
}: DeleteOneArgs, typeNameOverrides?: Record<string, string>, typeIndex?: TypeIndex): DeleteOneResult | undefined => {
  const mutationName = inflection.camelize(
    [inflection.underscore(operationName), 'mutation'].join('_'),
    true
  );

  if (!mutation.properties?.input?.properties) {
    console.log('no input field for mutation for ' + mutationName);
    return;
  }

  const modelName = inflection.camelize(
    [singularModel(mutation.model)].join('_'),
    true
  );

  // @ts-ignore
  const deleteAttrs: FieldProperty[] = objectToArray(
    mutation.properties.input.properties
  );

  const inputTypeName = resolveTypeName('input', (mutation.properties as any)?.input?.type || (mutation.properties as any)?.input, typeNameOverrides);
  let unresolved = 0;
  const variableDefinitions: VariableDefinitionNode[] = deleteAttrs.map(
    ({ name, type, isNotNull, isArray }) => {
      let gqlType: TypeNode | null = null as any;
      if (typeIndex && inputTypeName) {
        const ref = typeIndex.getInputFieldType(inputTypeName, name);
        const tn = refToTypeNode(ref, typeNameOverrides) as any;
        if (tn) gqlType = tn;
      }
      if (!gqlType) {
        const typeName = resolveTypeName(name, type, typeNameOverrides);
        gqlType = t.namedType({ type: typeName });
        if (isNotNull) {
          gqlType = t.nonNullType({ type: gqlType });
        }
        if (isArray) {
          gqlType = t.listType({ type: gqlType });
          gqlType = t.nonNullType({ type: gqlType });
        }
      }
      const nn = extractNamedTypeName(gqlType);
      if (nn === 'JSON') unresolved++;
      return t.variableDefinition({ variable: t.variable({ name }), type: gqlType as any });
    }
  );

  const mustUseRaw = unresolved > 0;
  const selectArgs: ArgumentNode[] = mustUseRaw
    ? [t.argument({ name: 'input', value: t.variable({ name: 'input' }) as any })]
    : [
      t.argument({
        name: 'input',
        value: t.objectValue({
          fields: deleteAttrs.map((f) => t.objectField({ name: f.name, value: t.variable({ name: f.name }) })),
        }),
      }),
    ];

  const selections: FieldNode[] = [t.field({ name: 'clientMutationId' })];

  const ast: DocumentNode = createGqlMutation({
    operationName,
    mutationName,
    selectArgs,
    selections,
    variableDefinitions: mustUseRaw
      ? [t.variableDefinition({ variable: t.variable({ name: 'input' }), type: t.nonNullType({ type: t.namedType({ type: inputTypeName }) }) as any })]
      : variableDefinitions,
    modelName,
    useModel: false,
  });

  return { name: mutationName, ast };
};

export interface CreateMutationArgs {
  operationName: string;
  mutation: MutationSpec;
  selection?: { mutationInputMode?: 'expanded' | 'model' | 'raw' | 'patchCollapsed'; connectionStyle?: 'nodes' | 'edges'; forceModelOutput?: boolean };
}

export interface CreateMutationResult {
  name: string;
  ast: DocumentNode;
}

export const createMutation = ({
  operationName,
  mutation,
  selection,
}: CreateMutationArgs, typeNameOverrides?: Record<string, string>, typeIndex?: TypeIndex): CreateMutationResult | undefined => {
  const mutationName = inflection.camelize(
    [inflection.underscore(operationName), 'mutation'].join('_'),
    true
  );

  if (!mutation.properties?.input?.properties) {
    console.log('no input field for mutation for ' + mutationName);
    return;
  }

  // @ts-ignore
  const otherAttrs: FieldProperty[] = objectToArray(
    mutation.properties.input.properties
  );

  const useRaw = selection?.mutationInputMode === 'raw';
  const inputTypeName = resolveTypeName('input', (mutation.properties as any)?.input?.type || (mutation.properties as any)?.input, typeNameOverrides);
  let unresolved = 0;
  const builtVarDefs: VariableDefinitionNode[] = otherAttrs.map(({ name, type, isArray, isArrayNotNull }) => {
    let gqlType: TypeNode | null = null as any;
    if (typeIndex && inputTypeName) {
      const ref = typeIndex.getInputFieldType(inputTypeName, name);
      const tn = refToTypeNode(ref, typeNameOverrides) as any;
      if (tn) gqlType = tn;
    }
    if (!gqlType) {
      const typeName = resolveTypeName(name, type, typeNameOverrides);
      gqlType = t.namedType({ type: typeName });
      gqlType = t.nonNullType({ type: gqlType });
      if (isArray) {
        gqlType = t.listType({ type: gqlType });
        if (isArrayNotNull) {
          gqlType = t.nonNullType({ type: gqlType });
        }
      }
      if ((gqlType as any).type && (gqlType as any).type.type && (gqlType as any).type.type.name === 'JSON') {
        unresolved++;
      }
    }
    return t.variableDefinition({ variable: t.variable({ name }), type: gqlType as any });
  });
  const mustUseRaw = useRaw || otherAttrs.length === 0 || unresolved > 0;
  const variableDefinitions: VariableDefinitionNode[] = mustUseRaw
    ? [t.variableDefinition({ variable: t.variable({ name: 'input' }), type: t.nonNullType({ type: t.namedType({ type: inputTypeName }) }) as any })]
    : builtVarDefs;

  const selectArgs: ArgumentNode[] = [
    t.argument({
      name: 'input',
      value: mustUseRaw
        ? (t.variable({ name: 'input' }) as any)
        : t.objectValue({
            fields: otherAttrs.map((f) => t.objectField({ name: f.name, value: t.variable({ name: f.name }) })),
          }),
    }),
  ];

  const scalarOutputs = (mutation.outputs || [])
    .filter((field) => field.type.kind === 'SCALAR')
    .map((f) => f.name);

  let objectOutputName: string | undefined = (mutation.outputs || [])
    .find((field) => field.type.kind === 'OBJECT')?.name;

  if (!objectOutputName) {
    const payloadTypeName = (mutation as any)?.output?.name;
    if (typeIndex && payloadTypeName) {
      const payloadType = (typeIndex as any).byName?.[payloadTypeName];
      const fields = (payloadType && Array.isArray(payloadType.fields)) ? payloadType.fields : [];
      const match = fields
        .filter((f: any) => f && f.name !== 'clientMutationId')
        .filter((f: any) => (refToNamedTypeName(f.type) || f.type?.name) !== 'Query')
        .find((f: any) => (refToNamedTypeName(f.type) || f.type?.name) === (mutation as any)?.model);
      if (match) objectOutputName = match.name;
    }
  }

  const selections: FieldNode[] = [];
  if (objectOutputName) {
    const modelTypeName = (mutation as any)?.model;
    const modelType = typeIndex && modelTypeName ? (typeIndex as any).byName?.[modelTypeName] : null;
    const fieldNames: string[] = (modelType && Array.isArray(modelType.fields))
      ? modelType.fields
          .filter((f: any) => {
            let r = f.type;
            while (r && (r.kind === 'NON_NULL' || r.kind === 'LIST')) r = r.ofType;
            const kind = r?.kind;
            return kind === 'SCALAR' || kind === 'ENUM';
          })
          .map((f: any) => f.name)
      : [];
    selections.push(
      t.field({
        name: objectOutputName,
        selectionSet: t.selectionSet({ selections: fieldNames.map((n) => t.field({ name: n })) }),
      })
    );
  }
  if (scalarOutputs.length > 0) {
    selections.push(...scalarOutputs.map((o) => t.field({ name: o })));
  } else {
    selections.push(t.field({ name: 'clientMutationId' }));
  }

  const ast: DocumentNode = createGqlMutation({
    operationName,
    mutationName,
    selectArgs,
    selections,
    variableDefinitions,
  });

  return { name: mutationName, ast };
};

type QType = 'mutation' | 'getOne' | 'getMany';
type MutationType = 'create' | 'patch' | 'delete' | string;

interface FlatField {
  name: string;
  selection: string[];
}

interface GqlField {
  qtype: QType;
  mutationType?: MutationType;
  model?: string;
  properties?: Record<string, Omit<FieldProperty, 'name'>>;
  outputs?: {
    name: string;
    type: {
      kind: string;
    };
  }[];
  selection?: QueryField[]
}

type QueryField = string | FlatField;

export interface GqlMap {
  [operationName: string]: GqlField;
}

interface AstMapEntry {
  name: string;
  ast: DocumentNode;
}

interface AstMap {
  [key: string]: AstMapEntry;
}

export const generate = (gql: GqlMap, selection?: { defaultMutationModelFields?: string[]; modelFields?: Record<string, string[]>; mutationInputMode?: 'expanded' | 'model' | 'raw' | 'patchCollapsed'; connectionStyle?: 'nodes' | 'edges'; forceModelOutput?: boolean }, typeNameOverrides?: Record<string, string>, typeIndex?: TypeIndex): AstMap => {
  return Object.keys(gql).reduce<AstMap>((m, operationName) => {
    const defn = gql[operationName];
    let name: string | undefined;
    let ast: DocumentNode | undefined;

    if (defn.qtype === 'mutation') {
      if (defn.mutationType === 'create') {
        ({ name, ast } = createOne({ operationName, mutation: defn as MutationSpec, selection }, typeNameOverrides, typeIndex) ?? {});
      } else if (defn.mutationType === 'patch') {
        ({ name, ast } = patchOne({ operationName, mutation: defn as MutationSpec, selection }, typeNameOverrides, typeIndex) ?? {});
      } else if (defn.mutationType === 'delete') {
        ({ name, ast } = deleteOne({ operationName, mutation: defn as MutationSpec }, typeNameOverrides, typeIndex) ?? {});
      } else {
        ({ name, ast } = createMutation({ operationName, mutation: defn as MutationSpec, selection }, typeNameOverrides, typeIndex) ?? {});
      }
    } else if (defn.qtype === 'getMany') {
      [
        getMany,
        getManyPaginatedEdges,
        getOrderByEnums,
        getFragment
      ].forEach(fn => {
        const result = (fn as any)({ operationName, query: defn });
        if (result?.name && result?.ast) {
          m[result.name] = result;
        }
      });
    } else if (defn.qtype === 'getOne') {
      // @ts-ignore
      ({ name, ast } = getOne({ operationName, query: defn }, typeNameOverrides) ?? {});
    } else {
      console.warn('Unknown qtype for key: ' + operationName);
    }

    if (name && ast) {
      m[name] = { name, ast };
    }

    return m;
  }, {});
};

export const generateGranular = (
  gql: GqlMap,
  model: string,
  fields: string[]
): AstMap => {
  return Object.keys(gql).reduce<AstMap>((m, operationName) => {
    const defn = gql[operationName];
    const matchModel = defn.model;

    let name: string | undefined;
    let ast: DocumentNode | undefined;

    if (defn.qtype === 'getMany') {
      const many = getMany({ operationName, query: defn, fields });
      if (many?.name && many?.ast && model === matchModel) {
        m[many.name] = many;
      }

      const paginatedEdges = getManyPaginatedEdges({
        operationName,
        query: defn,
        fields,
      });
      if (paginatedEdges?.name && paginatedEdges?.ast && model === matchModel) {
        m[paginatedEdges.name] = paginatedEdges;
      }

      const paginatedNodes = getManyPaginatedNodes({
        operationName,
        query: defn,
        fields,
      });
      if (paginatedNodes?.name && paginatedNodes?.ast && model === matchModel) {
        m[paginatedNodes.name] = paginatedNodes;
      }
    } else if (defn.qtype === 'getOne') {
      const one = getOne({ operationName, query: defn, fields });
      if (one?.name && one?.ast && model === matchModel) {
        m[one.name] = one;
      }
    }

    return m;
  }, {});
};


export function getSelections(
  query: GqlField,
  fields: string[] = []
): FieldNode[] {
  const useAll = fields.length === 0;

  const shouldDropId = typeof query.model === 'string' && /Extension$/i.test(query.model);

  const mapItem = (item: QueryField): FieldNode | null => {
    if (typeof item === 'string') {
      if (shouldDropId && item === 'id') return null;
      if (!useAll && !fields.includes(item)) return null;
      return t.field({ name: item });
    }
    if (
      typeof item === 'object' &&
      item !== null &&
      'name' in item &&
      'selection' in item &&
      Array.isArray(item.selection)
    ) {
      if (!useAll && !fields.includes(item.name)) return null;
      const isMany = (item as any).qtype === 'getMany';
      if (isMany) {
        return t.field({
          name: item.name,
          args: [t.argument({ name: 'first', value: t.intValue({ value: '3' as any }) })],
          selectionSet: t.selectionSet({
            selections: [
              t.field({
                name: 'edges',
                selectionSet: t.selectionSet({
                  selections: [
                    t.field({ name: 'cursor' }),
                    t.field({
                      name: 'node',
                      selectionSet: t.selectionSet({ selections: item.selection.map((s) => mapItem(s)).filter(Boolean) as FieldNode[] }),
                    }),
                  ],
                }),
              }),
            ],
          }),
        });
      }
      return t.field({
        name: item.name,
        selectionSet: t.selectionSet({ selections: item.selection.map((s) => mapItem(s)).filter(Boolean) as FieldNode[] }),
      });
    }
    return null;
  };

  return query.selection
    .filter((s: any) => !(shouldDropId && s === 'id'))
    .map((field) => mapItem(field))
    .filter((i): i is FieldNode => Boolean(i));
}
