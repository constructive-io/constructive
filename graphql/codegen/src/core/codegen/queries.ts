/**
 * Query hook generators using Babel AST-based code generation
 *
 * Output structure:
 * queries/
 *   useCarsQuery.ts    - List query hook
 *   useCarQuery.ts     - Single item query hook
 */
import type { CleanTable } from '../../types/schema';
import * as t from '@babel/types';
import { generateCode, addJSDocComment, typedParam, createTypedCallExpression } from './babel-ast';
import {
  buildListQueryAST,
  buildSingleQueryAST,
  printGraphQL,
} from './gql-ast';
import {
  getTableNames,
  getListQueryHookName,
  getSingleQueryHookName,
  getListQueryFileName,
  getSingleQueryFileName,
  getAllRowsQueryName,
  getSingleRowQueryName,
  getFilterTypeName,
  getConditionTypeName,
  getOrderByTypeName,
  getScalarFields,
  getScalarFilterType,
  getPrimaryKeyInfo,
  hasValidPrimaryKey,
  fieldTypeToTs,
  toScreamingSnake,
  ucFirst,
  lcFirst,
  getGeneratedFileHeader,
} from './utils';

export interface GeneratedQueryFile {
  fileName: string;
  content: string;
}

export interface QueryGeneratorOptions {
  reactQueryEnabled?: boolean;
  useCentralizedKeys?: boolean;
  hasRelationships?: boolean;
}

function createUnionType(values: string[]): t.TSUnionType {
  return t.tsUnionType(values.map((v) => t.tsLiteralType(t.stringLiteral(v))));
}

function createFilterInterfaceDeclaration(
  name: string,
  fieldFilters: Array<{ fieldName: string; filterType: string }>,
  isExported: boolean = true
): t.Statement {
  const properties: t.TSPropertySignature[] = [];
  for (const filter of fieldFilters) {
    const prop = t.tsPropertySignature(
      t.identifier(filter.fieldName),
      t.tsTypeAnnotation(t.tsTypeReference(t.identifier(filter.filterType)))
    );
    prop.optional = true;
    properties.push(prop);
  }
  const andProp = t.tsPropertySignature(
    t.identifier('and'),
    t.tsTypeAnnotation(t.tsArrayType(t.tsTypeReference(t.identifier(name))))
  );
  andProp.optional = true;
  properties.push(andProp);
  const orProp = t.tsPropertySignature(
    t.identifier('or'),
    t.tsTypeAnnotation(t.tsArrayType(t.tsTypeReference(t.identifier(name))))
  );
  orProp.optional = true;
  properties.push(orProp);
  const notProp = t.tsPropertySignature(
    t.identifier('not'),
    t.tsTypeAnnotation(t.tsTypeReference(t.identifier(name)))
  );
  notProp.optional = true;
  properties.push(notProp);
  const body = t.tsInterfaceBody(properties);
  const interfaceDecl = t.tsInterfaceDeclaration(
    t.identifier(name),
    null,
    null,
    body
  );
  if (isExported) {
    return t.exportNamedDeclaration(interfaceDecl);
  }
  return interfaceDecl;
}

export function generateListQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile {
  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true,
    hasRelationships = false,
  } = options;
  const { typeName, pluralName } = getTableNames(table);
  const hookName = getListQueryHookName(table);
  const queryName = getAllRowsQueryName(table);
  const filterTypeName = getFilterTypeName(table);
  const conditionTypeName = getConditionTypeName(table);
  const orderByTypeName = getOrderByTypeName(table);
  const scalarFields = getScalarFields(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;

  const queryAST = buildListQueryAST({ table });
  const queryDocument = printGraphQL(queryAST);

  const statements: t.Statement[] = [];

  const filterTypesUsed = new Set<string>();
  for (const field of scalarFields) {
    const filterType = getScalarFilterType(field.type.gqlType, field.type.isArray);
    if (filterType) {
      filterTypesUsed.add(filterType);
    }
  }

  if (reactQueryEnabled) {
    const reactQueryImport = t.importDeclaration(
      [t.importSpecifier(t.identifier('useQuery'), t.identifier('useQuery'))],
      t.stringLiteral('@tanstack/react-query')
    );
    statements.push(reactQueryImport);
    const reactQueryTypeImport = t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier('UseQueryOptions'),
          t.identifier('UseQueryOptions')
        ),
        t.importSpecifier(
          t.identifier('QueryClient'),
          t.identifier('QueryClient')
        ),
      ],
      t.stringLiteral('@tanstack/react-query')
    );
    reactQueryTypeImport.importKind = 'type';
    statements.push(reactQueryTypeImport);
  }

  const clientImport = t.importDeclaration(
    [t.importSpecifier(t.identifier('execute'), t.identifier('execute'))],
    t.stringLiteral('../client')
  );
  statements.push(clientImport);
  const clientTypeImport = t.importDeclaration(
    [
      t.importSpecifier(
        t.identifier('ExecuteOptions'),
        t.identifier('ExecuteOptions')
      ),
    ],
    t.stringLiteral('../client')
  );
  clientTypeImport.importKind = 'type';
  statements.push(clientTypeImport);

  const typesImport = t.importDeclaration(
    [
      t.importSpecifier(t.identifier(typeName), t.identifier(typeName)),
      ...Array.from(filterTypesUsed).map((ft) =>
        t.importSpecifier(t.identifier(ft), t.identifier(ft))
      ),
    ],
    t.stringLiteral('../types')
  );
  typesImport.importKind = 'type';
  statements.push(typesImport);

  if (useCentralizedKeys) {
    const queryKeyImport = t.importDeclaration(
      [t.importSpecifier(t.identifier(keysName), t.identifier(keysName))],
      t.stringLiteral('../query-keys')
    );
    statements.push(queryKeyImport);
    if (hasRelationships) {
      const scopeTypeImport = t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier(scopeTypeName),
            t.identifier(scopeTypeName)
          ),
        ],
        t.stringLiteral('../query-keys')
      );
      scopeTypeImport.importKind = 'type';
      statements.push(scopeTypeImport);
    }
  }

  const reExportDecl = t.exportNamedDeclaration(
    null,
    [t.exportSpecifier(t.identifier(typeName), t.identifier(typeName))],
    t.stringLiteral('../types')
  );
  reExportDecl.exportKind = 'type';
  statements.push(reExportDecl);

  const queryDocConst = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier(`${queryName}QueryDocument`),
      t.templateLiteral(
        [
          t.templateElement(
            { raw: '\n' + queryDocument, cooked: '\n' + queryDocument },
            true
          ),
        ],
        []
      )
    ),
  ]);
  statements.push(t.exportNamedDeclaration(queryDocConst));

  const fieldFilters = scalarFields
    .map((field) => {
      const filterType = getScalarFilterType(field.type.gqlType, field.type.isArray);
      return filterType ? { fieldName: field.name, filterType } : null;
    })
    .filter((f): f is { fieldName: string; filterType: string } => f !== null);

  statements.push(
    createFilterInterfaceDeclaration(filterTypeName, fieldFilters, false)
  );

  // Generate Condition interface (simple equality filter with scalar types)
  // Track non-primitive types (enums) that need to be imported
  const enumTypesUsed = new Set<string>();
  const conditionProperties: t.TSPropertySignature[] = scalarFields.map(
    (field) => {
      const tsType = fieldTypeToTs(field.type);
      const isPrimitive =
        tsType === 'string' ||
        tsType === 'number' ||
        tsType === 'boolean' ||
        tsType === 'unknown' ||
        tsType.endsWith('[]');
      let typeAnnotation: t.TSType;
      if (field.type.isArray) {
        const baseType = tsType.replace('[]', '');
        const isBasePrimitive =
          baseType === 'string' ||
          baseType === 'number' ||
          baseType === 'boolean' ||
          baseType === 'unknown';
        if (!isBasePrimitive) {
          enumTypesUsed.add(baseType);
        }
        typeAnnotation = t.tsArrayType(
          baseType === 'string'
            ? t.tsStringKeyword()
            : baseType === 'number'
              ? t.tsNumberKeyword()
              : baseType === 'boolean'
                ? t.tsBooleanKeyword()
                : t.tsTypeReference(t.identifier(baseType))
        );
      } else {
        if (!isPrimitive) {
          enumTypesUsed.add(tsType);
        }
        typeAnnotation =
          tsType === 'string'
            ? t.tsStringKeyword()
            : tsType === 'number'
              ? t.tsNumberKeyword()
              : tsType === 'boolean'
                ? t.tsBooleanKeyword()
                : t.tsTypeReference(t.identifier(tsType));
      }
      const prop = t.tsPropertySignature(
        t.identifier(field.name),
        t.tsTypeAnnotation(typeAnnotation)
      );
      prop.optional = true;
      return prop;
    }
  );

  // Add import for enum types if any are used
  if (enumTypesUsed.size > 0) {
    const schemaTypesImport = t.importDeclaration(
      Array.from(enumTypesUsed).map((et) =>
        t.importSpecifier(t.identifier(et), t.identifier(et))
      ),
      t.stringLiteral('../schema-types')
    );
    schemaTypesImport.importKind = 'type';
    statements.push(schemaTypesImport);
  }

  const conditionInterface = t.tsInterfaceDeclaration(
    t.identifier(conditionTypeName),
    null,
    null,
    t.tsInterfaceBody(conditionProperties)
  );
  statements.push(conditionInterface);

  const orderByValues = [
    ...scalarFields.flatMap((f) => [
      `${toScreamingSnake(f.name)}_ASC`,
      `${toScreamingSnake(f.name)}_DESC`,
    ]),
    'NATURAL',
    'PRIMARY_KEY_ASC',
    'PRIMARY_KEY_DESC',
  ];
  const orderByTypeAlias = t.tsTypeAliasDeclaration(
    t.identifier(orderByTypeName),
    null,
    createUnionType(orderByValues)
  );
  statements.push(orderByTypeAlias);

  const variablesInterfaceBody = t.tsInterfaceBody([
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('first'),
        t.tsTypeAnnotation(t.tsNumberKeyword())
      );
      p.optional = true;
      return p;
    })(),
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('last'),
        t.tsTypeAnnotation(t.tsNumberKeyword())
      );
      p.optional = true;
      return p;
    })(),
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('offset'),
        t.tsTypeAnnotation(t.tsNumberKeyword())
      );
      p.optional = true;
      return p;
    })(),
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('before'),
        t.tsTypeAnnotation(t.tsStringKeyword())
      );
      p.optional = true;
      return p;
    })(),
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('after'),
        t.tsTypeAnnotation(t.tsStringKeyword())
      );
      p.optional = true;
      return p;
    })(),
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('filter'),
        t.tsTypeAnnotation(t.tsTypeReference(t.identifier(filterTypeName)))
      );
      p.optional = true;
      return p;
    })(),
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('condition'),
        t.tsTypeAnnotation(t.tsTypeReference(t.identifier(conditionTypeName)))
      );
      p.optional = true;
      return p;
    })(),
    (() => {
      const p = t.tsPropertySignature(
        t.identifier('orderBy'),
        t.tsTypeAnnotation(
          t.tsArrayType(t.tsTypeReference(t.identifier(orderByTypeName)))
        )
      );
      p.optional = true;
      return p;
    })(),
  ]);
  const variablesInterface = t.tsInterfaceDeclaration(
    t.identifier(`${ucFirst(pluralName)}QueryVariables`),
    null,
    null,
    variablesInterfaceBody
  );
  statements.push(t.exportNamedDeclaration(variablesInterface));

  const pageInfoType = t.tsTypeLiteral([
    t.tsPropertySignature(
      t.identifier('hasNextPage'),
      t.tsTypeAnnotation(t.tsBooleanKeyword())
    ),
    t.tsPropertySignature(
      t.identifier('hasPreviousPage'),
      t.tsTypeAnnotation(t.tsBooleanKeyword())
    ),
    t.tsPropertySignature(
      t.identifier('startCursor'),
      t.tsTypeAnnotation(
        t.tsUnionType([t.tsStringKeyword(), t.tsNullKeyword()])
      )
    ),
    t.tsPropertySignature(
      t.identifier('endCursor'),
      t.tsTypeAnnotation(
        t.tsUnionType([t.tsStringKeyword(), t.tsNullKeyword()])
      )
    ),
  ]);
  const resultType = t.tsTypeLiteral([
    t.tsPropertySignature(
      t.identifier('totalCount'),
      t.tsTypeAnnotation(t.tsNumberKeyword())
    ),
    t.tsPropertySignature(
      t.identifier('nodes'),
      t.tsTypeAnnotation(
        t.tsArrayType(t.tsTypeReference(t.identifier(typeName)))
      )
    ),
    t.tsPropertySignature(
      t.identifier('pageInfo'),
      t.tsTypeAnnotation(pageInfoType)
    ),
  ]);
  const resultInterfaceBody = t.tsInterfaceBody([
    t.tsPropertySignature(
      t.identifier(queryName),
      t.tsTypeAnnotation(resultType)
    ),
  ]);
  const resultInterface = t.tsInterfaceDeclaration(
    t.identifier(`${ucFirst(pluralName)}QueryResult`),
    null,
    null,
    resultInterfaceBody
  );
  statements.push(t.exportNamedDeclaration(resultInterface));

  if (useCentralizedKeys) {
    const queryKeyConst = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(`${queryName}QueryKey`),
        t.memberExpression(t.identifier(keysName), t.identifier('list'))
      ),
    ]);
    const queryKeyExport = t.exportNamedDeclaration(queryKeyConst);
    addJSDocComment(queryKeyExport, [
      'Query key factory - re-exported from query-keys.ts',
    ]);
    statements.push(queryKeyExport);
  } else {
    const queryKeyArrow = t.arrowFunctionExpression(
      [
        typedParam(
          'variables',
          t.tsTypeReference(
            t.identifier(`${ucFirst(pluralName)}QueryVariables`)
          ),
          true
        ),
      ],
      t.tsAsExpression(
        t.arrayExpression([
          t.stringLiteral(typeName.toLowerCase()),
          t.stringLiteral('list'),
          t.identifier('variables'),
        ]),
        t.tsTypeReference(t.identifier('const'))
      )
    );
    const queryKeyConst = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(`${queryName}QueryKey`),
        queryKeyArrow
      ),
    ]);
    statements.push(t.exportNamedDeclaration(queryKeyConst));
  }

  if (reactQueryEnabled) {
    const hookBodyStatements: t.Statement[] = [];
    if (hasRelationships && useCentralizedKeys) {
      hookBodyStatements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern([
              t.objectProperty(
                t.identifier('scope'),
                t.identifier('scope'),
                false,
                true
              ),
              t.restElement(t.identifier('queryOptions')),
            ]),
            t.logicalExpression(
              '??',
              t.identifier('options'),
              t.objectExpression([])
            )
          ),
        ])
      );
      hookBodyStatements.push(
        t.returnStatement(
          t.callExpression(t.identifier('useQuery'), [
            t.objectExpression([
              t.objectProperty(
                t.identifier('queryKey'),
                t.callExpression(
                  t.memberExpression(
                    t.identifier(keysName),
                    t.identifier('list')
                  ),
                  [t.identifier('variables'), t.identifier('scope')]
                )
              ),
              t.objectProperty(
                t.identifier('queryFn'),
                t.arrowFunctionExpression(
                  [],
                  createTypedCallExpression(
                    t.identifier('execute'),
                    [t.identifier(`${queryName}QueryDocument`), t.identifier('variables')],
                    [
                      t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryResult`)),
                      t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
                    ]
                  )
                )
              ),
              t.spreadElement(t.identifier('queryOptions')),
            ]),
          ])
        )
      );
    } else if (useCentralizedKeys) {
      hookBodyStatements.push(
        t.returnStatement(
          t.callExpression(t.identifier('useQuery'), [
            t.objectExpression([
              t.objectProperty(
                t.identifier('queryKey'),
                t.callExpression(
                  t.memberExpression(
                    t.identifier(keysName),
                    t.identifier('list')
                  ),
                  [t.identifier('variables')]
                )
              ),
              t.objectProperty(
                t.identifier('queryFn'),
                t.arrowFunctionExpression(
                  [],
                  createTypedCallExpression(
                    t.identifier('execute'),
                    [t.identifier(`${queryName}QueryDocument`), t.identifier('variables')],
                    [
                      t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryResult`)),
                      t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
                    ]
                  )
                )
              ),
              t.spreadElement(t.identifier('options')),
            ]),
          ])
        )
      );
    } else {
      hookBodyStatements.push(
        t.returnStatement(
          t.callExpression(t.identifier('useQuery'), [
            t.objectExpression([
              t.objectProperty(
                t.identifier('queryKey'),
                t.callExpression(t.identifier(`${queryName}QueryKey`), [
                  t.identifier('variables'),
                ])
              ),
              t.objectProperty(
                t.identifier('queryFn'),
                t.arrowFunctionExpression(
                  [],
                  createTypedCallExpression(
                    t.identifier('execute'),
                    [t.identifier(`${queryName}QueryDocument`), t.identifier('variables')],
                    [
                      t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryResult`)),
                      t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
                    ]
                  )
                )
              ),
              t.spreadElement(t.identifier('options')),
            ]),
          ])
        )
      );
    }

    const hookParams: t.Identifier[] = [
      typedParam(
        'variables',
        t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
        true
      ),
    ];
    let optionsTypeStr: string;
    if (hasRelationships && useCentralizedKeys) {
      optionsTypeStr = `Omit<UseQueryOptions<${ucFirst(pluralName)}QueryResult, Error>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`;
    } else {
      optionsTypeStr = `Omit<UseQueryOptions<${ucFirst(pluralName)}QueryResult, Error>, 'queryKey' | 'queryFn'>`;
    }
    const optionsParam = t.identifier('options');
    optionsParam.optional = true;
    optionsParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier(optionsTypeStr))
    );
    hookParams.push(optionsParam);

    const hookFunc = t.functionDeclaration(
      t.identifier(hookName),
      hookParams,
      t.blockStatement(hookBodyStatements)
    );
    const hookExport = t.exportNamedDeclaration(hookFunc);
    const docLines = [
      `Query hook for fetching ${typeName} list`,
      '',
      '@example',
      '```tsx',
      `const { data, isLoading } = ${hookName}({`,
      '  first: 10,',
      '  filter: { name: { equalTo: "example" } },',
      "  orderBy: ['CREATED_AT_DESC'],",
      '});',
      '```',
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push('');
      docLines.push('@example With scope for hierarchical cache invalidation');
      docLines.push('```tsx');
      docLines.push(`const { data } = ${hookName}(`);
      docLines.push('  { first: 10 },');
      docLines.push("  { scope: { parentId: 'parent-id' } }");
      docLines.push(');');
      docLines.push('```');
    }
    addJSDocComment(hookExport, docLines);
    statements.push(hookExport);
  }

  const fetchFuncBody = t.blockStatement([
    t.returnStatement(
      createTypedCallExpression(
        t.identifier('execute'),
        [t.identifier(`${queryName}QueryDocument`), t.identifier('variables'), t.identifier('options')],
        [
          t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryResult`)),
          t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
        ]
      )
    ),
  ]);
  const fetchFunc = t.functionDeclaration(
    t.identifier(`fetch${ucFirst(pluralName)}Query`),
    [
      typedParam(
        'variables',
        t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
        true
      ),
      typedParam(
        'options',
        t.tsTypeReference(t.identifier('ExecuteOptions')),
        true
      ),
    ],
    fetchFuncBody
  );
  fetchFunc.async = true;
  fetchFunc.returnType = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Promise'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryResult`)),
      ])
    )
  );
  const fetchExport = t.exportNamedDeclaration(fetchFunc);
  addJSDocComment(fetchExport, [
    `Fetch ${typeName} list without React hooks`,
    '',
    '@example',
    '```ts',
    '// Direct fetch',
    `const data = await fetch${ucFirst(pluralName)}Query({ first: 10 });`,
    '',
    '// With QueryClient',
    'const data = await queryClient.fetchQuery({',
    `  queryKey: ${queryName}QueryKey(variables),`,
    `  queryFn: () => fetch${ucFirst(pluralName)}Query(variables),`,
    '});',
    '```',
  ]);
  statements.push(fetchExport);

  if (reactQueryEnabled) {
    const prefetchParams: t.Identifier[] = [
      typedParam(
        'queryClient',
        t.tsTypeReference(t.identifier('QueryClient'))
      ),
      typedParam(
        'variables',
        t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
        true
      ),
    ];
    if (hasRelationships && useCentralizedKeys) {
      prefetchParams.push(
        typedParam(
          'scope',
          t.tsTypeReference(t.identifier(scopeTypeName)),
          true
        )
      );
    }
    prefetchParams.push(
      typedParam(
        'options',
        t.tsTypeReference(t.identifier('ExecuteOptions')),
        true
      )
    );

    let prefetchQueryKeyExpr: t.Expression;
    if (hasRelationships && useCentralizedKeys) {
      prefetchQueryKeyExpr = t.callExpression(
        t.memberExpression(t.identifier(keysName), t.identifier('list')),
        [t.identifier('variables'), t.identifier('scope')]
      );
    } else if (useCentralizedKeys) {
      prefetchQueryKeyExpr = t.callExpression(
        t.memberExpression(t.identifier(keysName), t.identifier('list')),
        [t.identifier('variables')]
      );
    } else {
      prefetchQueryKeyExpr = t.callExpression(
        t.identifier(`${queryName}QueryKey`),
        [t.identifier('variables')]
      );
    }

    const prefetchFuncBody = t.blockStatement([
      t.expressionStatement(
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('queryClient'),
              t.identifier('prefetchQuery')
            ),
            [
              t.objectExpression([
                t.objectProperty(
                  t.identifier('queryKey'),
                  prefetchQueryKeyExpr
                ),
                t.objectProperty(
                  t.identifier('queryFn'),
                  t.arrowFunctionExpression(
                    [],
                    createTypedCallExpression(
                      t.identifier('execute'),
                      [t.identifier(`${queryName}QueryDocument`), t.identifier('variables'), t.identifier('options')],
                      [
                        t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryResult`)),
                        t.tsTypeReference(t.identifier(`${ucFirst(pluralName)}QueryVariables`)),
                      ]
                    )
                  )
                ),
              ]),
            ]
          )
        )
      ),
    ]);

    const prefetchFunc = t.functionDeclaration(
      t.identifier(`prefetch${ucFirst(pluralName)}Query`),
      prefetchParams,
      prefetchFuncBody
    );
    prefetchFunc.async = true;
    prefetchFunc.returnType = t.tsTypeAnnotation(
      t.tsTypeReference(
        t.identifier('Promise'),
        t.tsTypeParameterInstantiation([t.tsVoidKeyword()])
      )
    );
    const prefetchExport = t.exportNamedDeclaration(prefetchFunc);
    addJSDocComment(prefetchExport, [
      `Prefetch ${typeName} list for SSR or cache warming`,
      '',
      '@example',
      '```ts',
      `await prefetch${ucFirst(pluralName)}Query(queryClient, { first: 10 });`,
      '```',
    ]);
    statements.push(prefetchExport);
  }

  const code = generateCode(statements);
  const headerText = reactQueryEnabled
    ? `List query hook for ${typeName}`
    : `List query functions for ${typeName}`;
  const content = getGeneratedFileHeader(headerText) + '\n\n' + code;

  return {
    fileName: getListQueryFileName(table),
    content,
  };
}

export function generateSingleQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile | null {
  // Skip tables with composite keys - they are handled as custom queries
  if (!hasValidPrimaryKey(table)) {
    return null;
  }

  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true,
    hasRelationships = false,
  } = options;
  const { typeName, singularName } = getTableNames(table);
  const hookName = getSingleQueryHookName(table);
  const queryName = getSingleRowQueryName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];
  const pkName = pkField.name;
  const pkTsType = pkField.tsType;

  const queryAST = buildSingleQueryAST({ table });
  const queryDocument = printGraphQL(queryAST);

  const statements: t.Statement[] = [];

  if (reactQueryEnabled) {
    const reactQueryImport = t.importDeclaration(
      [t.importSpecifier(t.identifier('useQuery'), t.identifier('useQuery'))],
      t.stringLiteral('@tanstack/react-query')
    );
    statements.push(reactQueryImport);
    const reactQueryTypeImport = t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier('UseQueryOptions'),
          t.identifier('UseQueryOptions')
        ),
        t.importSpecifier(
          t.identifier('QueryClient'),
          t.identifier('QueryClient')
        ),
      ],
      t.stringLiteral('@tanstack/react-query')
    );
    reactQueryTypeImport.importKind = 'type';
    statements.push(reactQueryTypeImport);
  }

  const clientImport = t.importDeclaration(
    [t.importSpecifier(t.identifier('execute'), t.identifier('execute'))],
    t.stringLiteral('../client')
  );
  statements.push(clientImport);
  const clientTypeImport = t.importDeclaration(
    [
      t.importSpecifier(
        t.identifier('ExecuteOptions'),
        t.identifier('ExecuteOptions')
      ),
    ],
    t.stringLiteral('../client')
  );
  clientTypeImport.importKind = 'type';
  statements.push(clientTypeImport);

  const typesImport = t.importDeclaration(
    [t.importSpecifier(t.identifier(typeName), t.identifier(typeName))],
    t.stringLiteral('../types')
  );
  typesImport.importKind = 'type';
  statements.push(typesImport);

  if (useCentralizedKeys) {
    const queryKeyImport = t.importDeclaration(
      [t.importSpecifier(t.identifier(keysName), t.identifier(keysName))],
      t.stringLiteral('../query-keys')
    );
    statements.push(queryKeyImport);
    if (hasRelationships) {
      const scopeTypeImport = t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier(scopeTypeName),
            t.identifier(scopeTypeName)
          ),
        ],
        t.stringLiteral('../query-keys')
      );
      scopeTypeImport.importKind = 'type';
      statements.push(scopeTypeImport);
    }
  }

  const reExportDecl = t.exportNamedDeclaration(
    null,
    [t.exportSpecifier(t.identifier(typeName), t.identifier(typeName))],
    t.stringLiteral('../types')
  );
  reExportDecl.exportKind = 'type';
  statements.push(reExportDecl);

  const queryDocConst = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier(`${queryName}QueryDocument`),
      t.templateLiteral(
        [
          t.templateElement(
            { raw: '\n' + queryDocument, cooked: '\n' + queryDocument },
            true
          ),
        ],
        []
      )
    ),
  ]);
  statements.push(t.exportNamedDeclaration(queryDocConst));

  const pkTypeAnnotation =
    pkTsType === 'string'
      ? t.tsStringKeyword()
      : pkTsType === 'number'
        ? t.tsNumberKeyword()
        : t.tsTypeReference(t.identifier(pkTsType));

  const variablesInterfaceBody = t.tsInterfaceBody([
    t.tsPropertySignature(
      t.identifier(pkName),
      t.tsTypeAnnotation(pkTypeAnnotation)
    ),
  ]);
  const variablesInterface = t.tsInterfaceDeclaration(
    t.identifier(`${ucFirst(singularName)}QueryVariables`),
    null,
    null,
    variablesInterfaceBody
  );
  statements.push(t.exportNamedDeclaration(variablesInterface));

  const resultInterfaceBody = t.tsInterfaceBody([
    t.tsPropertySignature(
      t.identifier(queryName),
      t.tsTypeAnnotation(
        t.tsUnionType([
          t.tsTypeReference(t.identifier(typeName)),
          t.tsNullKeyword(),
        ])
      )
    ),
  ]);
  const resultInterface = t.tsInterfaceDeclaration(
    t.identifier(`${ucFirst(singularName)}QueryResult`),
    null,
    null,
    resultInterfaceBody
  );
  statements.push(t.exportNamedDeclaration(resultInterface));

  if (useCentralizedKeys) {
    const queryKeyConst = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(`${queryName}QueryKey`),
        t.memberExpression(t.identifier(keysName), t.identifier('detail'))
      ),
    ]);
    const queryKeyExport = t.exportNamedDeclaration(queryKeyConst);
    addJSDocComment(queryKeyExport, [
      'Query key factory - re-exported from query-keys.ts',
    ]);
    statements.push(queryKeyExport);
  } else {
    const queryKeyArrow = t.arrowFunctionExpression(
      [typedParam(pkName, pkTypeAnnotation)],
      t.tsAsExpression(
        t.arrayExpression([
          t.stringLiteral(typeName.toLowerCase()),
          t.stringLiteral('detail'),
          t.identifier(pkName),
        ]),
        t.tsTypeReference(t.identifier('const'))
      )
    );
    const queryKeyConst = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(`${queryName}QueryKey`),
        queryKeyArrow
      ),
    ]);
    statements.push(t.exportNamedDeclaration(queryKeyConst));
  }

  if (reactQueryEnabled) {
    const hookBodyStatements: t.Statement[] = [];
    if (hasRelationships && useCentralizedKeys) {
      hookBodyStatements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern([
              t.objectProperty(
                t.identifier('scope'),
                t.identifier('scope'),
                false,
                true
              ),
              t.restElement(t.identifier('queryOptions')),
            ]),
            t.logicalExpression(
              '??',
              t.identifier('options'),
              t.objectExpression([])
            )
          ),
        ])
      );
      hookBodyStatements.push(
        t.returnStatement(
          t.callExpression(t.identifier('useQuery'), [
            t.objectExpression([
              t.objectProperty(
                t.identifier('queryKey'),
                t.callExpression(
                  t.memberExpression(
                    t.identifier(keysName),
                    t.identifier('detail')
                  ),
                  [
                    t.memberExpression(
                      t.identifier('variables'),
                      t.identifier(pkName)
                    ),
                    t.identifier('scope'),
                  ]
                )
              ),
              t.objectProperty(
                t.identifier('queryFn'),
                t.arrowFunctionExpression(
                  [],
                  createTypedCallExpression(
                    t.identifier('execute'),
                    [t.identifier(`${queryName}QueryDocument`), t.identifier('variables')],
                    [
                      t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryResult`)),
                      t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`)),
                    ]
                  )
                )
              ),
              t.spreadElement(t.identifier('queryOptions')),
            ]),
          ])
        )
      );
    } else if (useCentralizedKeys) {
      hookBodyStatements.push(
        t.returnStatement(
          t.callExpression(t.identifier('useQuery'), [
            t.objectExpression([
              t.objectProperty(
                t.identifier('queryKey'),
                t.callExpression(
                  t.memberExpression(
                    t.identifier(keysName),
                    t.identifier('detail')
                  ),
                  [
                    t.memberExpression(
                      t.identifier('variables'),
                      t.identifier(pkName)
                    ),
                  ]
                )
              ),
              t.objectProperty(
                t.identifier('queryFn'),
                t.arrowFunctionExpression(
                  [],
                  createTypedCallExpression(
                    t.identifier('execute'),
                    [t.identifier(`${queryName}QueryDocument`), t.identifier('variables')],
                    [
                      t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryResult`)),
                      t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`)),
                    ]
                  )
                )
              ),
              t.spreadElement(t.identifier('options')),
            ]),
          ])
        )
      );
    } else {
      hookBodyStatements.push(
        t.returnStatement(
          t.callExpression(t.identifier('useQuery'), [
            t.objectExpression([
              t.objectProperty(
                t.identifier('queryKey'),
                t.callExpression(t.identifier(`${queryName}QueryKey`), [
                  t.memberExpression(
                    t.identifier('variables'),
                    t.identifier(pkName)
                  ),
                ])
              ),
              t.objectProperty(
                t.identifier('queryFn'),
                t.arrowFunctionExpression(
                  [],
                  createTypedCallExpression(
                    t.identifier('execute'),
                    [t.identifier(`${queryName}QueryDocument`), t.identifier('variables')],
                    [
                      t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryResult`)),
                      t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`)),
                    ]
                  )
                )
              ),
              t.spreadElement(t.identifier('options')),
            ]),
          ])
        )
      );
    }

    const hookParams: t.Identifier[] = [
      typedParam(
        'variables',
        t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`))
      ),
    ];
    let optionsTypeStr: string;
    if (hasRelationships && useCentralizedKeys) {
      optionsTypeStr = `Omit<UseQueryOptions<${ucFirst(singularName)}QueryResult, Error>, 'queryKey' | 'queryFn'> & { scope?: ${scopeTypeName} }`;
    } else {
      optionsTypeStr = `Omit<UseQueryOptions<${ucFirst(singularName)}QueryResult, Error>, 'queryKey' | 'queryFn'>`;
    }
    const optionsParam = t.identifier('options');
    optionsParam.optional = true;
    optionsParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier(optionsTypeStr))
    );
    hookParams.push(optionsParam);

    const hookFunc = t.functionDeclaration(
      t.identifier(hookName),
      hookParams,
      t.blockStatement(hookBodyStatements)
    );
    const hookExport = t.exportNamedDeclaration(hookFunc);
    const docLines = [
      `Query hook for fetching a single ${typeName}`,
      '',
      '@example',
      '```tsx',
      `const { data, isLoading } = ${hookName}({ ${pkName}: 'some-id' });`,
      '```',
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push('');
      docLines.push('@example With scope for hierarchical cache invalidation');
      docLines.push('```tsx');
      docLines.push(`const { data } = ${hookName}(`);
      docLines.push(`  { ${pkName}: 'some-id' },`);
      docLines.push("  { scope: { parentId: 'parent-id' } }");
      docLines.push(');');
      docLines.push('```');
    }
    addJSDocComment(hookExport, docLines);
    statements.push(hookExport);
  }

  const fetchFuncBody = t.blockStatement([
    t.returnStatement(
      createTypedCallExpression(
        t.identifier('execute'),
        [t.identifier(`${queryName}QueryDocument`), t.identifier('variables'), t.identifier('options')],
        [
          t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryResult`)),
          t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`)),
        ]
      )
    ),
  ]);
  const fetchFunc = t.functionDeclaration(
    t.identifier(`fetch${ucFirst(singularName)}Query`),
    [
      typedParam(
        'variables',
        t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`))
      ),
      typedParam(
        'options',
        t.tsTypeReference(t.identifier('ExecuteOptions')),
        true
      ),
    ],
    fetchFuncBody
  );
  fetchFunc.async = true;
  fetchFunc.returnType = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Promise'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryResult`)),
      ])
    )
  );
  const fetchExport = t.exportNamedDeclaration(fetchFunc);
  addJSDocComment(fetchExport, [
    `Fetch a single ${typeName} without React hooks`,
    '',
    '@example',
    '```ts',
    `const data = await fetch${ucFirst(singularName)}Query({ ${pkName}: 'some-id' });`,
    '```',
  ]);
  statements.push(fetchExport);

  if (reactQueryEnabled) {
    const prefetchParams: t.Identifier[] = [
      typedParam(
        'queryClient',
        t.tsTypeReference(t.identifier('QueryClient'))
      ),
      typedParam(
        'variables',
        t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`))
      ),
    ];
    if (hasRelationships && useCentralizedKeys) {
      prefetchParams.push(
        typedParam(
          'scope',
          t.tsTypeReference(t.identifier(scopeTypeName)),
          true
        )
      );
    }
    prefetchParams.push(
      typedParam(
        'options',
        t.tsTypeReference(t.identifier('ExecuteOptions')),
        true
      )
    );

    let prefetchQueryKeyExpr: t.Expression;
    if (hasRelationships && useCentralizedKeys) {
      prefetchQueryKeyExpr = t.callExpression(
        t.memberExpression(t.identifier(keysName), t.identifier('detail')),
        [
          t.memberExpression(t.identifier('variables'), t.identifier(pkName)),
          t.identifier('scope'),
        ]
      );
    } else if (useCentralizedKeys) {
      prefetchQueryKeyExpr = t.callExpression(
        t.memberExpression(t.identifier(keysName), t.identifier('detail')),
        [t.memberExpression(t.identifier('variables'), t.identifier(pkName))]
      );
    } else {
      prefetchQueryKeyExpr = t.callExpression(
        t.identifier(`${queryName}QueryKey`),
        [t.memberExpression(t.identifier('variables'), t.identifier(pkName))]
      );
    }

    const prefetchFuncBody = t.blockStatement([
      t.expressionStatement(
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('queryClient'),
              t.identifier('prefetchQuery')
            ),
            [
              t.objectExpression([
                t.objectProperty(
                  t.identifier('queryKey'),
                  prefetchQueryKeyExpr
                ),
                t.objectProperty(
                  t.identifier('queryFn'),
                  t.arrowFunctionExpression(
                    [],
                    createTypedCallExpression(
                      t.identifier('execute'),
                      [t.identifier(`${queryName}QueryDocument`), t.identifier('variables'), t.identifier('options')],
                      [
                        t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryResult`)),
                        t.tsTypeReference(t.identifier(`${ucFirst(singularName)}QueryVariables`)),
                      ]
                    )
                  )
                ),
              ]),
            ]
          )
        )
      ),
    ]);

    const prefetchFunc = t.functionDeclaration(
      t.identifier(`prefetch${ucFirst(singularName)}Query`),
      prefetchParams,
      prefetchFuncBody
    );
    prefetchFunc.async = true;
    prefetchFunc.returnType = t.tsTypeAnnotation(
      t.tsTypeReference(
        t.identifier('Promise'),
        t.tsTypeParameterInstantiation([t.tsVoidKeyword()])
      )
    );
    const prefetchExport = t.exportNamedDeclaration(prefetchFunc);
    addJSDocComment(prefetchExport, [
      `Prefetch a single ${typeName} for SSR or cache warming`,
      '',
      '@example',
      '```ts',
      `await prefetch${ucFirst(singularName)}Query(queryClient, { ${pkName}: 'some-id' });`,
      '```',
    ]);
    statements.push(prefetchExport);
  }

  const code = generateCode(statements);
  const headerText = reactQueryEnabled
    ? `Single item query hook for ${typeName}`
    : `Single item query functions for ${typeName}`;
  const content = getGeneratedFileHeader(headerText) + '\n\n' + code;

  return {
    fileName: getSingleQueryFileName(table),
    content,
  };
}

export function generateAllQueryHooks(
  tables: CleanTable[],
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile[] {
  const files: GeneratedQueryFile[] = [];
  for (const table of tables) {
    files.push(generateListQueryHook(table, options));
    const singleHook = generateSingleQueryHook(table, options);
    if (singleHook) {
      files.push(singleHook);
    }
  }
  return files;
}
