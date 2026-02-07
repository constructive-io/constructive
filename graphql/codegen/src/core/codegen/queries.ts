/**
 * Query hook generators - delegates to ORM model methods (Babel AST-based)
 *
 * Output structure:
 * queries/
 *   useCarsQuery.ts    - List query hook -> ORM findMany
 *   useCarQuery.ts     - Single item query hook -> ORM findOne
 */
import * as t from '@babel/types';

import type { CleanTable } from '../../types/schema';
import { asConst } from './babel-ast';
import {
  addJSDocComment,
  buildFindManyCallExpr,
  buildFindOneCallExpr,
  buildListSelectionArgsCall,
  buildSelectionArgsCall,
  buildSelectFallbackExpr,
  callExpr,
  connectionResultType,
  constDecl,
  createFunctionParam,
  createImportDeclaration,
  createSAndTDataTypeParams,
  createSTypeParam,
  createTDataTypeParam,
  createTypeReExport,
  destructureParamsWithSelection,
  destructureParamsWithSelectionAndScope,
  exportAsyncDeclareFunction,
  exportAsyncFunction,
  exportDeclareFunction,
  exportFunction,
  generateHookFileCode,
  inferSelectResultType,
  listQueryResultType,
  listSelectionConfigType,
  objectProp,
  omitType,
  returnUseQuery,
  scopeTypeLiteral,
  selectionConfigType,
  singleQueryResultType,
  spreadObj,
  sRef,
  typeofRef,
  typeRef,
  typeLiteralWithProps,
  useQueryOptionsType,
  useQueryOptionsImplType,
  voidStatement,
  withFieldsListSelectionType,
  withFieldsSelectionType,
  withoutFieldsListSelectionType,
  withoutFieldsSelectionType
} from './hooks-ast';
import {
  getAllRowsQueryName,
  getDefaultSelectFieldName,
  getFilterTypeName,
  getListQueryFileName,
  getListQueryHookName,
  getOrderByTypeName,
  getPrimaryKeyInfo,
  getSingleQueryFileName,
  getSingleQueryHookName,
  getSingleRowQueryName,
  getTableNames,
  hasValidPrimaryKey,
  lcFirst,
  ucFirst
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

export function generateListQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile {
  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true,
    hasRelationships = false
  } = options;
  const { typeName, pluralName, singularName } = getTableNames(table);
  const hookName = getListQueryHookName(table);
  const queryName = getAllRowsQueryName(table);
  const filterTypeName = getFilterTypeName(table);
  const orderByTypeName = getOrderByTypeName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const defaultFieldName = getDefaultSelectFieldName(table);

  const listResultTypeAST = (sel: t.TSType) => listQueryResultType(queryName, relationTypeName, sel);

  const statements: t.Statement[] = [];

  // Imports
  if (reactQueryEnabled) {
    statements.push(createImportDeclaration('@tanstack/react-query', ['useQuery']));
    statements.push(createImportDeclaration('@tanstack/react-query', ['UseQueryOptions', 'UseQueryResult', 'QueryClient'], true));
  }
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(createImportDeclaration('../selection', ['buildListSelectionArgs']));
  statements.push(createImportDeclaration('../selection', ['ListSelectionConfig'], true));

  if (useCentralizedKeys) {
    statements.push(createImportDeclaration('../query-keys', [keysName]));
    if (hasRelationships) {
      statements.push(createImportDeclaration('../query-keys', [scopeTypeName], true));
    }
  }

  statements.push(createImportDeclaration('../../orm/input-types', [selectTypeName, relationTypeName, filterTypeName, orderByTypeName], true));
  statements.push(createImportDeclaration('../../orm/select-types', ['FindManyArgs', 'InferSelectResult', 'ConnectionResult', 'StrictSelect'], true));

  // Re-exports
  statements.push(createTypeReExport([selectTypeName, relationTypeName, filterTypeName, orderByTypeName], '../../orm/input-types'));

  // Default select
  statements.push(constDecl('defaultSelect', asConst(t.objectExpression([objectProp(defaultFieldName, t.booleanLiteral(true))]))));

  // Query key
  if (useCentralizedKeys) {
    const keyDecl = t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(`${queryName}QueryKey`),
          t.memberExpression(t.identifier(keysName), t.identifier('list'))
        )
      ])
    );
    addJSDocComment(keyDecl, ['Query key factory - re-exported from query-keys.ts']);
    statements.push(keyDecl);
  } else {
    const keyFn = t.arrowFunctionExpression(
      [createFunctionParam('variables', typeRef('FindManyArgs', [t.tsUnknownKeyword(), typeRef(filterTypeName), typeRef(orderByTypeName)]), true)],
      asConst(t.arrayExpression([t.stringLiteral(typeName.toLowerCase()), t.stringLiteral('list'), t.identifier('variables')]))
    );
    statements.push(t.exportNamedDeclaration(
      t.variableDeclaration('const', [t.variableDeclarator(t.identifier(`${queryName}QueryKey`), keyFn)])
    ));
  }

  // Helper for query key call
  const buildListQueryKey = (argsExpr: t.Expression, scopeExpr?: t.Expression) => {
    if (useCentralizedKeys) {
      const args = [argsExpr];
      if (scopeExpr) args.push(scopeExpr);
      return callExpr(t.memberExpression(t.identifier(keysName), t.identifier('list')), args);
    }
    return callExpr(t.identifier(`${queryName}QueryKey`), [argsExpr]);
  };

  // Helper for findMany queryFn
  const buildFindManyFn = () => t.arrowFunctionExpression(
    [],
    buildFindManyCallExpr(singularName, 'args', selectTypeName)
  );

  // Options type builder with optional scope
  const buildOptionsType = (queryDataType: t.TSType, dataType: t.TSType) => {
    const base = omitType(
      typeRef('UseQueryOptions', [queryDataType, typeRef('Error'), dataType]),
      ['queryKey', 'queryFn']
    );
    if (hasRelationships && useCentralizedKeys) {
      return t.tsIntersectionType([base, scopeTypeLiteral(scopeTypeName)]);
    }
    return base;
  };

  // Hook
  if (reactQueryEnabled) {
    const docLines = [
      `Query hook for fetching ${typeName} list`,
      '',
      '@example',
      '```tsx',
      `const { data, isLoading } = ${hookName}({`,
      '  selection: {',
      '    fields: { id: true, name: true },',
      '    where: { name: { equalTo: "example" } },',
      "    orderBy: ['CREATED_AT_DESC'],",
      '    first: 10,',
      '  },',
      '});',
      '```'
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push('');
      docLines.push('@example With scope for hierarchical cache invalidation');
      docLines.push('```tsx');
      docLines.push(`const { data } = ${hookName}({`);
      docLines.push('  selection: { first: 10 },');
      docLines.push("  scope: { parentId: 'parent-id' },");
      docLines.push('});');
      docLines.push('```');
    }

    // Overload 1: with fields
    const o1ParamType = t.tsIntersectionType([
      t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier('selection'),
          t.tsTypeAnnotation(withFieldsListSelectionType(sRef(), selectTypeName, filterTypeName, orderByTypeName))
        )
      ]),
      buildOptionsType(listResultTypeAST(sRef()), typeRef('TData'))
    ]);
    const o1 = exportDeclareFunction(
      hookName,
      createSAndTDataTypeParams(selectTypeName, listResultTypeAST(sRef())),
      [createFunctionParam('params', o1ParamType)],
      typeRef('UseQueryResult', [typeRef('TData')])
    );
    addJSDocComment(o1, docLines);
    statements.push(o1);

    // Overload 2: without fields
    const o2SelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(withoutFieldsListSelectionType(selectTypeName, filterTypeName, orderByTypeName))
    );
    o2SelProp.optional = true;
    const o2ParamType = t.tsIntersectionType([
      t.tsTypeLiteral([o2SelProp]),
      buildOptionsType(listResultTypeAST(typeofRef('defaultSelect')), typeRef('TData'))
    ]);
    statements.push(
      exportDeclareFunction(
        hookName,
        createTDataTypeParam(listResultTypeAST(typeofRef('defaultSelect'))),
        [createFunctionParam('params', o2ParamType, true)],
        typeRef('UseQueryResult', [typeRef('TData')])
      )
    );

    // Implementation
    const implSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(listSelectionConfigType(typeRef(selectTypeName), filterTypeName, orderByTypeName))
    );
    implSelProp.optional = true;
    const implOptionsType = (() => {
      const base = useQueryOptionsImplType();
      if (hasRelationships && useCentralizedKeys) {
        return t.tsIntersectionType([base, scopeTypeLiteral(scopeTypeName)]);
      }
      return base;
    })();
    const implParamType = t.tsIntersectionType([
      t.tsTypeLiteral([implSelProp]),
      implOptionsType
    ]);

    const body: t.Statement[] = [];
    body.push(constDecl('selection', t.optionalMemberExpression(t.identifier('params'), t.identifier('selection'), false, true)));
    body.push(buildListSelectionArgsCall(selectTypeName, filterTypeName, orderByTypeName));

    if (hasRelationships && useCentralizedKeys) {
      body.push(destructureParamsWithSelectionAndScope('queryOptions'));
      body.push(voidStatement('_selection'));
      body.push(returnUseQuery(
        buildListQueryKey(t.identifier('args'), t.identifier('scope')),
        buildFindManyFn(),
        [spreadObj(t.identifier('queryOptions'))]
      ));
    } else {
      body.push(destructureParamsWithSelection('queryOptions'));
      body.push(voidStatement('_selection'));
      body.push(returnUseQuery(
        buildListQueryKey(t.identifier('args')),
        buildFindManyFn(),
        [spreadObj(t.identifier('queryOptions'))]
      ));
    }

    statements.push(exportFunction(hookName, null, [createFunctionParam('params', implParamType, true)], body));
  }

  // Fetch function
  const fetchFnName = `fetch${ucFirst(pluralName)}Query`;
  {
    // Overload 1: with fields
    const f1ParamType = t.tsTypeLiteral([
      t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(withFieldsListSelectionType(sRef(), selectTypeName, filterTypeName, orderByTypeName))
      )
    ]);
    const f1Decl = exportAsyncDeclareFunction(
      fetchFnName,
      createSTypeParam(selectTypeName),
      [createFunctionParam('params', f1ParamType)],
      typeRef('Promise', [listResultTypeAST(sRef())])
    );
    addJSDocComment(f1Decl, [
      `Fetch ${typeName} list without React hooks`,
      '',
      '@example',
      '```ts',
      `const data = await ${fetchFnName}({`,
      '  selection: {',
      '    fields: { id: true },',
      '    first: 10,',
      '  },',
      '});',
      '```'
    ]);
    statements.push(f1Decl);

    // Overload 2: without fields
    const f2SelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(withoutFieldsListSelectionType(selectTypeName, filterTypeName, orderByTypeName))
    );
    f2SelProp.optional = true;
    statements.push(
      exportAsyncDeclareFunction(
        fetchFnName,
        null,
        [createFunctionParam('params', t.tsTypeLiteral([f2SelProp]), true)],
        typeRef('Promise', [listResultTypeAST(typeofRef('defaultSelect'))])
      )
    );

    // Implementation
    const fImplSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(listSelectionConfigType(typeRef(selectTypeName), filterTypeName, orderByTypeName))
    );
    fImplSelProp.optional = true;
    const fBody: t.Statement[] = [];
    fBody.push(buildListSelectionArgsCall(selectTypeName, filterTypeName, orderByTypeName));
    fBody.push(t.returnStatement(buildFindManyCallExpr(singularName, 'args', selectTypeName)));
    statements.push(exportAsyncFunction(fetchFnName, null, [createFunctionParam('params', t.tsTypeLiteral([fImplSelProp]), true)], fBody));
  }

  // Prefetch function
  if (reactQueryEnabled) {
    const prefetchFnName = `prefetch${ucFirst(pluralName)}Query`;

    // Overload 1: with fields
    const p1Params: t.TSPropertySignature[] = [
      t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(withFieldsListSelectionType(sRef(), selectTypeName, filterTypeName, orderByTypeName))
      )
    ];
    const p1ParamType = hasRelationships && useCentralizedKeys
      ? t.tsIntersectionType([t.tsTypeLiteral(p1Params), scopeTypeLiteral(scopeTypeName)])
      : t.tsTypeLiteral(p1Params);
    const p1Decl = exportAsyncDeclareFunction(
      prefetchFnName,
      createSTypeParam(selectTypeName),
      [createFunctionParam('queryClient', typeRef('QueryClient')), createFunctionParam('params', p1ParamType)],
      typeRef('Promise', [t.tsVoidKeyword()])
    );
    addJSDocComment(p1Decl, [
      `Prefetch ${typeName} list for SSR or cache warming`,
      '',
      '@example',
      '```ts',
      `await ${prefetchFnName}(queryClient, { selection: { first: 10 } });`,
      '```'
    ]);
    statements.push(p1Decl);

    // Overload 2: without fields
    const p2SelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(withoutFieldsListSelectionType(selectTypeName, filterTypeName, orderByTypeName))
    );
    p2SelProp.optional = true;
    const p2ParamType = hasRelationships && useCentralizedKeys
      ? t.tsIntersectionType([t.tsTypeLiteral([p2SelProp]), scopeTypeLiteral(scopeTypeName)])
      : t.tsTypeLiteral([p2SelProp]);
    statements.push(
      exportAsyncDeclareFunction(
        prefetchFnName,
        null,
        [createFunctionParam('queryClient', typeRef('QueryClient')), createFunctionParam('params', p2ParamType, true)],
        typeRef('Promise', [t.tsVoidKeyword()])
      )
    );

    // Implementation
    const pImplSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(listSelectionConfigType(typeRef(selectTypeName), filterTypeName, orderByTypeName))
    );
    pImplSelProp.optional = true;
    const pImplParamType = hasRelationships && useCentralizedKeys
      ? t.tsIntersectionType([t.tsTypeLiteral([pImplSelProp]), scopeTypeLiteral(scopeTypeName)])
      : t.tsTypeLiteral([pImplSelProp]);

    const pBody: t.Statement[] = [];
    pBody.push(buildListSelectionArgsCall(selectTypeName, filterTypeName, orderByTypeName));

    const queryKeyExpr = hasRelationships && useCentralizedKeys
      ? buildListQueryKey(t.identifier('args'), t.optionalMemberExpression(t.identifier('params'), t.identifier('scope'), false, true))
      : buildListQueryKey(t.identifier('args'));

    const prefetchCall = callExpr(
      t.memberExpression(t.identifier('queryClient'), t.identifier('prefetchQuery')),
      [t.objectExpression([
        objectProp('queryKey', queryKeyExpr),
        objectProp('queryFn', buildFindManyFn())
      ])]
    );
    pBody.push(t.expressionStatement(t.awaitExpression(prefetchCall)));

    statements.push(
      exportAsyncFunction(
        prefetchFnName,
        null,
        [createFunctionParam('queryClient', typeRef('QueryClient')), createFunctionParam('params', pImplParamType, true)],
        pBody,
        t.tsVoidKeyword()
      )
    );
  }

  const headerText = reactQueryEnabled
    ? `List query hook for ${typeName}`
    : `List query functions for ${typeName}`;

  return {
    fileName: getListQueryFileName(table),
    content: generateHookFileCode(headerText, statements)
  };
}

export function generateSingleQueryHook(
  table: CleanTable,
  options: QueryGeneratorOptions = {}
): GeneratedQueryFile | null {
  if (!hasValidPrimaryKey(table)) return null;

  const {
    reactQueryEnabled = true,
    useCentralizedKeys = true,
    hasRelationships = false
  } = options;
  const { typeName, singularName } = getTableNames(table);
  const hookName = getSingleQueryHookName(table);
  const queryName = getSingleRowQueryName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const scopeTypeName = `${typeName}Scope`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];
  const pkFieldName = pkField?.name ?? 'id';
  const pkFieldTsType = pkField?.tsType ?? 'string';
  const defaultFieldName = getDefaultSelectFieldName(table);

  const pkTsType: t.TSType = pkFieldTsType === 'string' ? t.tsStringKeyword() : t.tsNumberKeyword();
  const singleResultTypeAST = (sel: t.TSType) => singleQueryResultType(queryName, relationTypeName, sel);

  const statements: t.Statement[] = [];

  // Imports
  if (reactQueryEnabled) {
    statements.push(createImportDeclaration('@tanstack/react-query', ['useQuery']));
    statements.push(createImportDeclaration('@tanstack/react-query', ['UseQueryOptions', 'UseQueryResult', 'QueryClient'], true));
  }
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(createImportDeclaration('../selection', ['buildSelectionArgs']));
  statements.push(createImportDeclaration('../selection', ['SelectionConfig'], true));

  if (useCentralizedKeys) {
    statements.push(createImportDeclaration('../query-keys', [keysName]));
    if (hasRelationships) {
      statements.push(createImportDeclaration('../query-keys', [scopeTypeName], true));
    }
  }

  statements.push(createImportDeclaration('../../orm/input-types', [selectTypeName, relationTypeName], true));
  statements.push(createImportDeclaration('../../orm/select-types', ['InferSelectResult', 'StrictSelect'], true));

  // Re-exports
  statements.push(createTypeReExport([selectTypeName, relationTypeName], '../../orm/input-types'));

  // Default select
  statements.push(constDecl('defaultSelect', asConst(t.objectExpression([objectProp(defaultFieldName, t.booleanLiteral(true))]))));

  // Query key
  if (useCentralizedKeys) {
    const keyDecl = t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(`${queryName}QueryKey`),
          t.memberExpression(t.identifier(keysName), t.identifier('detail'))
        )
      ])
    );
    addJSDocComment(keyDecl, ['Query key factory - re-exported from query-keys.ts']);
    statements.push(keyDecl);
  } else {
    const keyFn = t.arrowFunctionExpression(
      [createFunctionParam('id', pkTsType)],
      asConst(t.arrayExpression([t.stringLiteral(typeName.toLowerCase()), t.stringLiteral('detail'), t.identifier('id')]))
    );
    statements.push(t.exportNamedDeclaration(
      t.variableDeclaration('const', [t.variableDeclarator(t.identifier(`${queryName}QueryKey`), keyFn)])
    ));
  }

  // Helper for query key call
  const buildDetailQueryKey = (pkExpr: t.Expression, scopeExpr?: t.Expression) => {
    if (useCentralizedKeys) {
      const args = [pkExpr];
      if (scopeExpr) args.push(scopeExpr);
      return callExpr(t.memberExpression(t.identifier(keysName), t.identifier('detail')), args);
    }
    return callExpr(t.identifier(`${queryName}QueryKey`), [pkExpr]);
  };

  // Helper for findOne queryFn
  const buildFindOneFn = () => t.arrowFunctionExpression(
    [],
    buildFindOneCallExpr(singularName, pkFieldName, 'args', selectTypeName)
  );

  // Options type builder with optional scope
  const buildSingleOptionsType = (queryDataType: t.TSType, dataType: t.TSType) => {
    const base = omitType(
      typeRef('UseQueryOptions', [queryDataType, typeRef('Error'), dataType]),
      ['queryKey', 'queryFn']
    );
    if (hasRelationships && useCentralizedKeys) {
      return t.tsIntersectionType([base, scopeTypeLiteral(scopeTypeName)]);
    }
    return base;
  };

  // Hook
  if (reactQueryEnabled) {
    const docLines = [
      `Query hook for fetching a single ${typeName}`,
      '',
      '@example',
      '```tsx',
      `const { data, isLoading } = ${hookName}({`,
      `  ${pkFieldName}: 'some-id',`,
      '  selection: { fields: { id: true, name: true } },',
      '});',
      '```'
    ];
    if (hasRelationships && useCentralizedKeys) {
      docLines.push('');
      docLines.push('@example With scope for hierarchical cache invalidation');
      docLines.push('```tsx');
      docLines.push(`const { data } = ${hookName}({`);
      docLines.push(`  ${pkFieldName}: 'some-id',`);
      docLines.push("  scope: { parentId: 'parent-id' },");
      docLines.push('});');
      docLines.push('```');
    }

    // Overload 1: with fields
    const o1Props = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(withFieldsSelectionType(sRef(), selectTypeName))
      )
    ];
    const o1ParamType = t.tsIntersectionType([
      t.tsTypeLiteral(o1Props),
      buildSingleOptionsType(singleResultTypeAST(sRef()), typeRef('TData'))
    ]);
    const o1 = exportDeclareFunction(
      hookName,
      createSAndTDataTypeParams(selectTypeName, singleResultTypeAST(sRef())),
      [createFunctionParam('params', o1ParamType)],
      typeRef('UseQueryResult', [typeRef('TData')])
    );
    addJSDocComment(o1, docLines);
    statements.push(o1);

    // Overload 2: without fields
    const o2SelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(withoutFieldsSelectionType())
    );
    o2SelProp.optional = true;
    const o2Props = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      o2SelProp
    ];
    const o2ParamType = t.tsIntersectionType([
      t.tsTypeLiteral(o2Props),
      buildSingleOptionsType(singleResultTypeAST(typeofRef('defaultSelect')), typeRef('TData'))
    ]);
    statements.push(
      exportDeclareFunction(
        hookName,
        createTDataTypeParam(singleResultTypeAST(typeofRef('defaultSelect'))),
        [createFunctionParam('params', o2ParamType)],
        typeRef('UseQueryResult', [typeRef('TData')])
      )
    );

    // Implementation
    const implSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName)))
    );
    implSelProp.optional = true;
    const implProps = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      implSelProp
    ];
    const implOptionsType = (() => {
      const base = useQueryOptionsImplType();
      if (hasRelationships && useCentralizedKeys) {
        return t.tsIntersectionType([base, scopeTypeLiteral(scopeTypeName)]);
      }
      return base;
    })();
    const implParamType = t.tsIntersectionType([
      t.tsTypeLiteral(implProps),
      implOptionsType
    ]);

    const body: t.Statement[] = [];
    // const args = buildSelectionArgs<SelectType>(params.selection);
    const argsCall = t.callExpression(t.identifier('buildSelectionArgs'), [
      t.memberExpression(t.identifier('params'), t.identifier('selection'))
    ]);
    // @ts-ignore
    argsCall.typeParameters = t.tsTypeParameterInstantiation([typeRef(selectTypeName)]);
    body.push(constDecl('args', argsCall));

    const pkMemberExpr = t.memberExpression(t.identifier('params'), t.identifier(pkFieldName));

    if (hasRelationships && useCentralizedKeys) {
      body.push(destructureParamsWithSelectionAndScope('queryOptions'));
      body.push(voidStatement('_selection'));
      body.push(returnUseQuery(
        buildDetailQueryKey(pkMemberExpr, t.identifier('scope')),
        buildFindOneFn(),
        [spreadObj(t.identifier('queryOptions'))]
      ));
    } else {
      body.push(destructureParamsWithSelection('queryOptions'));
      body.push(voidStatement('_selection'));
      body.push(returnUseQuery(
        buildDetailQueryKey(pkMemberExpr),
        buildFindOneFn(),
        [spreadObj(t.identifier('queryOptions'))]
      ));
    }

    statements.push(exportFunction(hookName, null, [createFunctionParam('params', implParamType)], body));
  }

  // Fetch function
  const fetchFnName = `fetch${ucFirst(singularName)}Query`;
  {
    // Overload 1: with fields
    const f1Props = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      t.tsPropertySignature(t.identifier('selection'), t.tsTypeAnnotation(withFieldsSelectionType(sRef(), selectTypeName)))
    ];
    const f1Decl = exportAsyncDeclareFunction(
      fetchFnName,
      createSTypeParam(selectTypeName),
      [createFunctionParam('params', t.tsTypeLiteral(f1Props))],
      typeRef('Promise', [singleResultTypeAST(sRef())])
    );
    addJSDocComment(f1Decl, [
      `Fetch a single ${typeName} without React hooks`,
      '',
      '@example',
      '```ts',
      `const data = await ${fetchFnName}({`,
      `  ${pkFieldName}: 'some-id',`,
      '  selection: { fields: { id: true } },',
      '});',
      '```'
    ]);
    statements.push(f1Decl);

    // Overload 2: without fields
    const f2SelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(withoutFieldsSelectionType())
    );
    f2SelProp.optional = true;
    const f2Props = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      f2SelProp
    ];
    statements.push(
      exportAsyncDeclareFunction(
        fetchFnName,
        null,
        [createFunctionParam('params', t.tsTypeLiteral(f2Props))],
        typeRef('Promise', [singleResultTypeAST(typeofRef('defaultSelect'))])
      )
    );

    // Implementation
    const fImplSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName)))
    );
    fImplSelProp.optional = true;
    const fImplProps = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      fImplSelProp
    ];
    const fBody: t.Statement[] = [];
    const fArgsCall = t.callExpression(t.identifier('buildSelectionArgs'), [
      t.memberExpression(t.identifier('params'), t.identifier('selection'))
    ]);
    // @ts-ignore
    fArgsCall.typeParameters = t.tsTypeParameterInstantiation([typeRef(selectTypeName)]);
    fBody.push(constDecl('args', fArgsCall));
    fBody.push(t.returnStatement(buildFindOneCallExpr(singularName, pkFieldName, 'args', selectTypeName)));
    statements.push(exportAsyncFunction(fetchFnName, null, [createFunctionParam('params', t.tsTypeLiteral(fImplProps))], fBody));
  }

  // Prefetch function
  if (reactQueryEnabled) {
    const prefetchFnName = `prefetch${ucFirst(singularName)}Query`;

    // Overload 1: with fields
    const p1Props: t.TSPropertySignature[] = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      t.tsPropertySignature(t.identifier('selection'), t.tsTypeAnnotation(withFieldsSelectionType(sRef(), selectTypeName)))
    ];
    const p1ParamType = hasRelationships && useCentralizedKeys
      ? t.tsIntersectionType([t.tsTypeLiteral(p1Props), scopeTypeLiteral(scopeTypeName)])
      : t.tsTypeLiteral(p1Props);
    const p1Decl = exportAsyncDeclareFunction(
      prefetchFnName,
      createSTypeParam(selectTypeName),
      [createFunctionParam('queryClient', typeRef('QueryClient')), createFunctionParam('params', p1ParamType)],
      typeRef('Promise', [t.tsVoidKeyword()])
    );
    addJSDocComment(p1Decl, [
      `Prefetch a single ${typeName} for SSR or cache warming`,
      '',
      '@example',
      '```ts',
      `await ${prefetchFnName}(queryClient, { ${pkFieldName}: 'some-id' });`,
      '```'
    ]);
    statements.push(p1Decl);

    // Overload 2: without fields
    const p2SelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(withoutFieldsSelectionType())
    );
    p2SelProp.optional = true;
    const p2Props: t.TSPropertySignature[] = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      p2SelProp
    ];
    const p2ParamType = hasRelationships && useCentralizedKeys
      ? t.tsIntersectionType([t.tsTypeLiteral(p2Props), scopeTypeLiteral(scopeTypeName)])
      : t.tsTypeLiteral(p2Props);
    statements.push(
      exportAsyncDeclareFunction(
        prefetchFnName,
        null,
        [createFunctionParam('queryClient', typeRef('QueryClient')), createFunctionParam('params', p2ParamType)],
        typeRef('Promise', [t.tsVoidKeyword()])
      )
    );

    // Implementation
    const pImplSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName)))
    );
    pImplSelProp.optional = true;
    const pImplProps: t.TSPropertySignature[] = [
      t.tsPropertySignature(t.identifier(pkFieldName), t.tsTypeAnnotation(pkTsType)),
      pImplSelProp
    ];
    const pImplParamType = hasRelationships && useCentralizedKeys
      ? t.tsIntersectionType([t.tsTypeLiteral(pImplProps), scopeTypeLiteral(scopeTypeName)])
      : t.tsTypeLiteral(pImplProps);

    const pBody: t.Statement[] = [];
    const pArgsCall = t.callExpression(t.identifier('buildSelectionArgs'), [
      t.memberExpression(t.identifier('params'), t.identifier('selection'))
    ]);
    // @ts-ignore
    pArgsCall.typeParameters = t.tsTypeParameterInstantiation([typeRef(selectTypeName)]);
    pBody.push(constDecl('args', pArgsCall));

    const queryKeyExpr = hasRelationships && useCentralizedKeys
      ? buildDetailQueryKey(
        t.memberExpression(t.identifier('params'), t.identifier(pkFieldName)),
        t.optionalMemberExpression(t.identifier('params'), t.identifier('scope'), false, true)
      )
      : buildDetailQueryKey(t.memberExpression(t.identifier('params'), t.identifier(pkFieldName)));

    const prefetchCall = callExpr(
      t.memberExpression(t.identifier('queryClient'), t.identifier('prefetchQuery')),
      [t.objectExpression([
        objectProp('queryKey', queryKeyExpr),
        objectProp('queryFn', buildFindOneFn())
      ])]
    );
    pBody.push(t.expressionStatement(t.awaitExpression(prefetchCall)));

    statements.push(
      exportAsyncFunction(
        prefetchFnName,
        null,
        [createFunctionParam('queryClient', typeRef('QueryClient')), createFunctionParam('params', pImplParamType)],
        pBody,
        t.tsVoidKeyword()
      )
    );
  }

  const headerText = reactQueryEnabled
    ? `Single item query hook for ${typeName}`
    : `Single item query functions for ${typeName}`;

  return {
    fileName: getSingleQueryFileName(table),
    content: generateHookFileCode(headerText, statements)
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
