/**
 * Custom query hook generators for non-table operations (Babel AST-based)
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., currentUser, nodeById, etc.)
 *
 * Delegates to ORM custom query operations:
 *   getClient().query.operationName(args, { select }).unwrap()
 *
 * Output structure:
 * queries/
 *   useCurrentUserQuery.ts
 *   useNodeQuery.ts
 *   ...
 */
import * as t from '@babel/types';

import type { CleanOperation, TypeRegistry } from '../../types/schema';
import { asConst } from './babel-ast';
import {
  addJSDocComment,
  buildSelectionArgsCall,
  callExpr,
  constDecl,
  createFunctionParam,
  createImportDeclaration,
  createSAndTDataTypeParams,
  createSTypeParam,
  createTDataTypeParam,
  createTypeReExport,
  customSelectResultTypeLiteral,
  destructureParamsWithSelection,
  exportAsyncDeclareFunction,
  exportAsyncFunction,
  exportDeclareFunction,
  exportFunction,
  generateHookFileCode,
  getClientCustomCallUnwrap,
  objectProp,
  omitType,
  returnUseQuery,
  selectionConfigType,
  spreadObj,
  sRef,
  typeRef,
  typeRefToTsTypeAST,
  useQueryOptionsImplType,
  useQueryOptionsType,
  voidStatement,
  wrapInferSelectResultType,
} from './hooks-ast';
import { getSelectTypeName } from './select-helpers';
import {
  createTypeTracker,
  getOperationFileName,
  getOperationHookName,
  getQueryKeyName,
  getTypeBaseName,
  isTypeRequired,
  typeRefToTsType,
} from './type-resolver';
import { ucFirst } from './utils';

export interface GeneratedCustomQueryFile {
  fileName: string;
  content: string;
  operationName: string;
}

export interface GenerateCustomQueryHookOptions {
  operation: CleanOperation;
  typeRegistry: TypeRegistry;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateCustomQueryHook(
  options: GenerateCustomQueryHookOptions,
): GeneratedCustomQueryFile {
  const {
    operation,
    typeRegistry,
    reactQueryEnabled = true,
    tableTypeNames,
    useCentralizedKeys = true,
  } = options;

  const hookName = getOperationHookName(operation.name, 'query');
  const fileName = getOperationFileName(operation.name, 'query');
  const queryKeyName = getQueryKeyName(operation.name);
  const varTypeName = `${ucFirst(operation.name)}Variables`;

  const tracker = createTypeTracker({ tableTypeNames });

  const hasArgs = operation.args.length > 0;
  const hasRequiredArgs = operation.args.some((arg) =>
    isTypeRequired(arg.type),
  );

  typeRefToTsType(operation.returnType, tracker);
  for (const arg of operation.args) {
    typeRefToTsType(arg.type, tracker);
  }
  const resultTsType = typeRefToTsTypeAST(operation.returnType);

  const selectTypeName = getSelectTypeName(operation.returnType);
  const payloadTypeName = getTypeBaseName(operation.returnType);
  const hasSelect = !!selectTypeName && !!payloadTypeName;

  const statements: t.Statement[] = [];

  // Imports
  if (reactQueryEnabled) {
    statements.push(
      createImportDeclaration('@tanstack/react-query', ['useQuery']),
    );
    statements.push(
      createImportDeclaration(
        '@tanstack/react-query',
        ['UseQueryOptions', 'UseQueryResult', 'QueryClient'],
        true,
      ),
    );
  }

  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration('../selection', ['buildSelectionArgs']),
  );
  statements.push(
    createImportDeclaration('../selection', ['SelectionConfig'], true),
  );

  if (useCentralizedKeys) {
    statements.push(
      createImportDeclaration('../query-keys', ['customQueryKeys']),
    );
  }

  if (hasArgs) {
    statements.push(
      createImportDeclaration('../../orm/query', [varTypeName], true),
    );
  }

  const inputTypeImports: string[] = [];
  if (hasSelect) {
    inputTypeImports.push(selectTypeName!);
    inputTypeImports.push(payloadTypeName!);
  } else {
    const baseName = getTypeBaseName(operation.returnType);
    if (baseName && !tracker.referencedTypes.has('__skip__')) {
      for (const refType of tracker.referencedTypes) {
        if (!inputTypeImports.includes(refType)) {
          inputTypeImports.push(refType);
        }
      }
    }
  }
  if (inputTypeImports.length > 0) {
    statements.push(
      createImportDeclaration('../../orm/input-types', inputTypeImports, true),
    );
  }

  if (hasSelect) {
    statements.push(
    createImportDeclaration(
      '../../orm/select-types',
      ['InferSelectResult', 'HookStrictSelect'],
      true,
    ),
  );
  }

  // Re-exports
  if (hasArgs) {
    statements.push(createTypeReExport([varTypeName], '../../orm/query'));
  }
  if (hasSelect) {
    statements.push(
      createTypeReExport([selectTypeName!], '../../orm/input-types'),
    );
  }

  // Query key
  if (useCentralizedKeys) {
    const keyDecl = t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(queryKeyName),
          t.memberExpression(
            t.identifier('customQueryKeys'),
            t.identifier(operation.name),
          ),
        ),
      ]),
    );
    addJSDocComment(keyDecl, [
      'Query key factory - re-exported from query-keys.ts',
    ]);
    statements.push(keyDecl);
  } else if (hasArgs) {
    const keyFn = t.arrowFunctionExpression(
      [createFunctionParam('variables', typeRef(varTypeName), true)],
      asConst(
        t.arrayExpression([
          t.stringLiteral(operation.name),
          t.identifier('variables'),
        ]),
      ),
    );
    const keyDecl = t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(queryKeyName), keyFn),
      ]),
    );
    addJSDocComment(keyDecl, ['Query key factory for caching']);
    statements.push(keyDecl);
  } else {
    const keyFn = t.arrowFunctionExpression(
      [],
      asConst(t.arrayExpression([t.stringLiteral(operation.name)])),
    );
    const keyDecl = t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(queryKeyName), keyFn),
      ]),
    );
    addJSDocComment(keyDecl, ['Query key factory for caching']);
    statements.push(keyDecl);
  }

  // Helper to build query key call expression
  const buildQueryKeyCall = (withVars: boolean) => {
    if (useCentralizedKeys) {
      return withVars
        ? callExpr(t.identifier(queryKeyName), [t.identifier('variables')])
        : callExpr(t.identifier(queryKeyName), []);
    }
    return withVars
      ? callExpr(t.identifier(queryKeyName), [t.identifier('variables')])
      : callExpr(t.identifier(queryKeyName), []);
  };

  // Helper to build the fields+StrictSelect intersection type
  const fieldsSelectionType = (s: t.TSType) =>
    t.tsParenthesizedType(
      t.tsIntersectionType([
        t.tsTypeLiteral([
          t.tsPropertySignature(
            t.identifier('fields'),
            t.tsTypeAnnotation(
              t.tsIntersectionType([s, typeRef(selectTypeName!)]),
            ),
          ),
        ]),
        typeRef('HookStrictSelect', [
          typeRef('NoInfer', [s]),
          typeRef(selectTypeName!),
        ]),
      ]),
    );

  const selectedResultType = (sel: t.TSType) =>
    customSelectResultTypeLiteral(
      operation.name,
      operation.returnType,
      payloadTypeName!,
      sel,
    );

  // Hook
  if (reactQueryEnabled) {
    const description =
      operation.description || `Query hook for ${operation.name}`;
    const argNames = operation.args.map((a) => a.name).join(', ');
    const exampleCall = hasArgs
      ? hasSelect
        ? `${hookName}({ variables: { ${argNames} }, selection: { fields: { id: true } } })`
        : `${hookName}({ variables: { ${argNames} } })`
      : hasSelect
        ? `${hookName}({ selection: { fields: { id: true } } })`
        : `${hookName}()`;

    if (hasSelect) {
      // Overload 1: with selection.fields
      const o1Props: t.TSPropertySignature[] = [];
      if (hasArgs) {
        const varProp = t.tsPropertySignature(
          t.identifier('variables'),
          t.tsTypeAnnotation(typeRef(varTypeName)),
        );
        if (!hasRequiredArgs) {
          varProp.optional = true;
        }
        o1Props.push(varProp);
      }
      o1Props.push(
        t.tsPropertySignature(
          t.identifier('selection'),
          t.tsTypeAnnotation(fieldsSelectionType(sRef())),
        ),
      );
      const o1ParamType = t.tsIntersectionType([
        t.tsTypeLiteral(o1Props),
        omitType(
          typeRef('UseQueryOptions', [
            selectedResultType(sRef()),
            typeRef('Error'),
            typeRef('TData'),
          ]),
          ['queryKey', 'queryFn'],
        ),
      ]);
      const o1 = exportDeclareFunction(
        hookName,
        createSAndTDataTypeParams(selectTypeName!, selectedResultType(sRef())),
        [createFunctionParam('params', o1ParamType)],
        typeRef('UseQueryResult', [typeRef('TData')]),
      );
      addJSDocComment(o1, [
        description,
        '',
        '@example',
        '```tsx',
        `const { data, isLoading } = ${exampleCall};`,
        '',
        `if (data?.${operation.name}) {`,
        `  console.log(data.${operation.name});`,
        '}',
        '```',
      ]);
      statements.push(o1);

      // Implementation
      const implProps: t.TSPropertySignature[] = [];
      if (hasArgs) {
        const varProp = t.tsPropertySignature(
          t.identifier('variables'),
          t.tsTypeAnnotation(typeRef(varTypeName)),
        );
        if (!hasRequiredArgs) varProp.optional = true;
        implProps.push(varProp);
      }
      const implSelProp = t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName!))),
      );
      implProps.push(implSelProp);
      const implParamType = t.tsIntersectionType([
        t.tsTypeLiteral(implProps),
        useQueryOptionsImplType(),
      ]);
      const implParam = createFunctionParam(
        'params',
        implParamType,
        false,
      );

      const body: t.Statement[] = [];
      if (hasArgs) {
        body.push(
          constDecl(
            'variables',
            hasRequiredArgs
              ? t.memberExpression(
                  t.identifier('params'),
                  t.identifier('variables'),
                )
              : t.logicalExpression(
                  '??',
                  t.memberExpression(t.identifier('params'), t.identifier('variables')),
                  t.objectExpression([]),
                ),
          ),
        );
      }
      body.push(buildSelectionArgsCall(selectTypeName!));

      if (hasArgs) {
        const destructPattern = t.objectPattern([
          t.objectProperty(
            t.identifier('variables'),
            t.identifier('_variables'),
            false,
            false,
          ),
          t.objectProperty(
            t.identifier('selection'),
            t.identifier('_selection'),
            false,
            false,
          ),
          t.restElement(t.identifier('queryOptions')),
        ]);
        body.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              destructPattern,
              t.logicalExpression(
                '??',
                t.identifier('params'),
                t.objectExpression([]),
              ),
            ),
          ]),
        );
        body.push(voidStatement('_variables'));
        body.push(voidStatement('_selection'));
      } else {
        body.push(destructureParamsWithSelection('queryOptions'));
        body.push(voidStatement('_selection'));
      }

      const selectArgExpr = t.objectExpression([
        objectProp(
          'select',
          t.memberExpression(t.identifier('args'), t.identifier('select')),
        ),
      ]);
      const queryFnArgs = hasArgs
        ? [
            hasRequiredArgs
              ? t.tsNonNullExpression(t.identifier('variables'))
              : t.identifier('variables'),
            selectArgExpr,
          ]
        : [selectArgExpr];
      const queryFnExpr = t.arrowFunctionExpression(
        [],
        getClientCustomCallUnwrap(
          'query',
          operation.name,
          queryFnArgs as t.Expression[],
        ),
      );

      const extraProps: (t.ObjectProperty | t.SpreadElement)[] = [];
      const enabledExpr = hasRequiredArgs
        ? t.logicalExpression(
            '&&',
            t.unaryExpression(
              '!',
              t.unaryExpression('!', t.identifier('variables')),
            ),
            t.binaryExpression(
              '!==',
              t.optionalMemberExpression(
                t.identifier('params'),
                t.identifier('enabled'),
                false,
                true,
              ),
              t.booleanLiteral(false),
            ),
          )
        : undefined;
      extraProps.push(spreadObj(t.identifier('queryOptions')));

      body.push(
        returnUseQuery(
          buildQueryKeyCall(hasArgs),
          queryFnExpr,
          extraProps,
          enabledExpr,
        ),
      );
      statements.push(exportFunction(hookName, null, [implParam], body));
    } else {
      // Without select: simple hook (scalar return type)
      const resultTypeLiteral = t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier(operation.name),
          t.tsTypeAnnotation(resultTsType),
        ),
      ]);

      const optType = omitType(
        typeRef('UseQueryOptions', [
          resultTypeLiteral,
          typeRef('Error'),
          typeRef('TData'),
        ]),
        ['queryKey', 'queryFn'],
      );

      let paramType: t.TSType;
      if (hasArgs) {
        const varProp = t.tsPropertySignature(
          t.identifier('variables'),
          t.tsTypeAnnotation(typeRef(varTypeName)),
        );
        if (!hasRequiredArgs) varProp.optional = true;
        paramType = t.tsIntersectionType([t.tsTypeLiteral([varProp]), optType]);
      } else {
        paramType = optType;
      }

      const implParam = createFunctionParam(
        'params',
        paramType,
        !hasRequiredArgs,
      );
      const hookDecl = exportDeclareFunction(
        hookName,
        createTDataTypeParam(resultTypeLiteral),
        [implParam],
        typeRef('UseQueryResult', [typeRef('TData')]),
      );
      addJSDocComment(hookDecl, [
        description,
        '',
        '@example',
        '```tsx',
        `const { data, isLoading } = ${exampleCall};`,
        '',
        `if (data?.${operation.name}) {`,
        `  console.log(data.${operation.name});`,
        '}',
        '```',
      ]);

      const body: t.Statement[] = [];
      if (hasArgs) {
        body.push(
          constDecl(
            'variables',
            hasRequiredArgs
              ? t.optionalMemberExpression(
                  t.identifier('params'),
                  t.identifier('variables'),
                  false,
                  true,
                )
              : t.logicalExpression(
                  '??',
                  t.optionalMemberExpression(
                    t.identifier('params'),
                    t.identifier('variables'),
                    false,
                    true,
                  ),
                  t.objectExpression([]),
                ),
          ),
        );
        const destructPattern = t.objectPattern([
          t.objectProperty(
            t.identifier('variables'),
            t.identifier('_variables'),
            false,
            false,
          ),
          t.restElement(t.identifier('queryOptions')),
        ]);
        body.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              destructPattern,
              t.logicalExpression(
                '??',
                t.identifier('params'),
                t.objectExpression([]),
              ),
            ),
          ]),
        );
        body.push(voidStatement('_variables'));
      } else {
        body.push(
          constDecl(
            'queryOptions',
            t.logicalExpression(
              '??',
              t.identifier('params'),
              t.objectExpression([]),
            ),
          ),
        );
      }

      const queryFnArgs = hasArgs
        ? [
            hasRequiredArgs
              ? t.tsNonNullExpression(t.identifier('variables'))
              : t.identifier('variables'),
          ]
        : [];
      const queryFnExpr = t.arrowFunctionExpression(
        [],
        getClientCustomCallUnwrap(
          'query',
          operation.name,
          queryFnArgs as t.Expression[],
        ),
      );

      const enabledExpr = hasRequiredArgs
        ? t.logicalExpression(
            '&&',
            t.unaryExpression(
              '!',
              t.unaryExpression('!', t.identifier('variables')),
            ),
            t.binaryExpression(
              '!==',
              t.optionalMemberExpression(
                t.identifier('params'),
                t.identifier('enabled'),
                false,
                true,
              ),
              t.booleanLiteral(false),
            ),
          )
        : undefined;

      body.push(
        returnUseQuery(
          buildQueryKeyCall(hasArgs),
          queryFnExpr,
          [spreadObj(t.identifier('queryOptions'))],
          enabledExpr,
        ),
      );

      // We need the implementation version (not declare), with return type
      statements.push(hookDecl);
      statements.push(
        exportFunction(
          hookName,
          createTDataTypeParam(resultTypeLiteral),
          [implParam],
          body,
          typeRef('UseQueryResult', [typeRef('TData')]),
        ),
      );
    }
  }

  // Fetch function (non-hook)
  const fetchFnName = `fetch${ucFirst(operation.name)}Query`;
  const fetchArgNames = operation.args.map((a) => a.name).join(', ');
  const fetchExampleCall = hasArgs
    ? hasSelect
      ? `${fetchFnName}({ variables: { ${fetchArgNames} }, selection: { fields: { id: true } } })`
      : `${fetchFnName}({ variables: { ${fetchArgNames} } })`
    : hasSelect
      ? `${fetchFnName}({ selection: { fields: { id: true } } })`
      : `${fetchFnName}()`;

  if (hasSelect) {
    // Overload 1: with fields
    const f1Props: t.TSPropertySignature[] = [];
    if (hasArgs) {
      const varProp = t.tsPropertySignature(
        t.identifier('variables'),
        t.tsTypeAnnotation(typeRef(varTypeName)),
      );
      if (!hasRequiredArgs) {
        varProp.optional = true;
      }
      f1Props.push(varProp);
    }
    f1Props.push(
      t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(fieldsSelectionType(sRef())),
      ),
    );
    const f1Decl = exportAsyncDeclareFunction(
      fetchFnName,
      createSTypeParam(selectTypeName!),
      [createFunctionParam('params', t.tsTypeLiteral(f1Props))],
      typeRef('Promise', [selectedResultType(sRef())]),
    );
    addJSDocComment(f1Decl, [
      `Fetch ${operation.name} without React hooks`,
      '',
      '@example',
      '```ts',
      `const data = await ${fetchExampleCall};`,
      '```',
    ]);
    statements.push(f1Decl);

    // Implementation
    const fImplProps: t.TSPropertySignature[] = [];
    if (hasArgs) {
      const varProp = t.tsPropertySignature(
        t.identifier('variables'),
        t.tsTypeAnnotation(typeRef(varTypeName)),
      );
      if (!hasRequiredArgs) varProp.optional = true;
      fImplProps.push(varProp);
    }
    const fImplSelProp = t.tsPropertySignature(
      t.identifier('selection'),
      t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName!))),
    );
    fImplProps.push(fImplSelProp);

    const fBody: t.Statement[] = [];
    if (hasArgs) {
      fBody.push(
        constDecl(
          'variables',
          hasRequiredArgs
            ? t.memberExpression(t.identifier('params'), t.identifier('variables'))
            : t.logicalExpression(
                '??',
                t.memberExpression(t.identifier('params'), t.identifier('variables')),
                t.objectExpression([]),
              ),
        ),
      );
    }
    fBody.push(buildSelectionArgsCall(selectTypeName!));
    const selectArgExpr = t.objectExpression([
      objectProp(
        'select',
        t.memberExpression(t.identifier('args'), t.identifier('select')),
      ),
    ]);
    const fCallArgs = hasArgs
      ? [
          hasRequiredArgs
            ? t.tsNonNullExpression(t.identifier('variables'))
            : t.identifier('variables'),
          selectArgExpr,
        ]
      : [selectArgExpr];
    fBody.push(
      t.returnStatement(
        getClientCustomCallUnwrap(
          'query',
          operation.name,
          fCallArgs as t.Expression[],
        ),
      ),
    );
    statements.push(
      exportAsyncFunction(
        fetchFnName,
        null,
        [
          createFunctionParam(
            'params',
            t.tsTypeLiteral(fImplProps),
            false,
          ),
        ],
        fBody,
      ),
    );
  } else {
    const fBody: t.Statement[] = [];
    if (hasArgs) {
      const fProps: t.TSPropertySignature[] = [];
      const varProp = t.tsPropertySignature(
        t.identifier('variables'),
        t.tsTypeAnnotation(typeRef(varTypeName)),
      );
      if (!hasRequiredArgs) varProp.optional = true;
      fProps.push(varProp);
      fBody.push(
        constDecl(
          'variables',
          hasRequiredArgs
            ? t.optionalMemberExpression(
                t.identifier('params'),
                t.identifier('variables'),
                false,
                true,
              )
            : t.logicalExpression(
                '??',
                t.optionalMemberExpression(
                  t.identifier('params'),
                  t.identifier('variables'),
                  false,
                  true,
                ),
                t.objectExpression([]),
              ),
        ),
      );
      const fCallArgs = hasRequiredArgs
        ? [t.tsNonNullExpression(t.identifier('variables'))]
        : [t.identifier('variables')];
      fBody.push(
        t.returnStatement(
          getClientCustomCallUnwrap(
            'query',
            operation.name,
            fCallArgs as t.Expression[],
          ),
        ),
      );
      const fDecl = exportAsyncFunction(
        fetchFnName,
        null,
        [
          createFunctionParam(
            'params',
            t.tsTypeLiteral(fProps),
            !hasRequiredArgs,
          ),
        ],
        fBody,
      );
      addJSDocComment(fDecl, [
        `Fetch ${operation.name} without React hooks`,
        '',
        '@example',
        '```ts',
        `const data = await ${fetchExampleCall};`,
        '```',
      ]);
      statements.push(fDecl);
    } else {
      fBody.push(
        t.returnStatement(
          getClientCustomCallUnwrap('query', operation.name, []),
        ),
      );
      const fDecl = exportAsyncFunction(fetchFnName, null, [], fBody);
      addJSDocComment(fDecl, [
        `Fetch ${operation.name} without React hooks`,
        '',
        '@example',
        '```ts',
        `const data = await ${fetchExampleCall};`,
        '```',
      ]);
      statements.push(fDecl);
    }
  }

  // Prefetch function
  if (reactQueryEnabled) {
    const prefetchFnName = `prefetch${ucFirst(operation.name)}Query`;
    const prefetchArgNames = operation.args.map((a) => a.name).join(', ');
    const prefetchExampleCall = hasArgs
      ? hasSelect
        ? `${prefetchFnName}(queryClient, { variables: { ${prefetchArgNames} }, selection: { fields: { id: true } } })`
        : `${prefetchFnName}(queryClient, { variables: { ${prefetchArgNames} } })`
      : hasSelect
        ? `${prefetchFnName}(queryClient, { selection: { fields: { id: true } } })`
        : `${prefetchFnName}(queryClient)`;

    if (hasSelect) {
      // Overload 1: with fields
      const p1Props: t.TSPropertySignature[] = [];
      if (hasArgs) {
        const varProp = t.tsPropertySignature(
          t.identifier('variables'),
          t.tsTypeAnnotation(typeRef(varTypeName)),
        );
        if (!hasRequiredArgs) {
          varProp.optional = true;
        }
        p1Props.push(varProp);
      }
      p1Props.push(
        t.tsPropertySignature(
          t.identifier('selection'),
          t.tsTypeAnnotation(fieldsSelectionType(sRef())),
        ),
      );
      const p1Decl = exportAsyncDeclareFunction(
        prefetchFnName,
        createSTypeParam(selectTypeName!),
        [
          createFunctionParam('queryClient', typeRef('QueryClient')),
          createFunctionParam('params', t.tsTypeLiteral(p1Props)),
        ],
        typeRef('Promise', [t.tsVoidKeyword()]),
      );
      addJSDocComment(p1Decl, [
        `Prefetch ${operation.name} for SSR or cache warming`,
        '',
        '@example',
        '```ts',
        `await ${prefetchExampleCall};`,
        '```',
      ]);
      statements.push(p1Decl);

      // Implementation
      const pImplProps: t.TSPropertySignature[] = [];
      if (hasArgs) {
        const varProp = t.tsPropertySignature(
          t.identifier('variables'),
          t.tsTypeAnnotation(typeRef(varTypeName)),
        );
        if (!hasRequiredArgs) varProp.optional = true;
        pImplProps.push(varProp);
      }
      const pImplSelProp = t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName!))),
      );
      pImplProps.push(pImplSelProp);

      const pBody: t.Statement[] = [];
      if (hasArgs) {
        pBody.push(
          constDecl(
            'variables',
            hasRequiredArgs
              ? t.memberExpression(
                  t.identifier('params'),
                  t.identifier('variables'),
                )
              : t.logicalExpression(
                  '??',
                  t.memberExpression(t.identifier('params'), t.identifier('variables')),
                  t.objectExpression([]),
                ),
          ),
        );
      }
      pBody.push(buildSelectionArgsCall(selectTypeName!));
      const selectArgExpr = t.objectExpression([
        objectProp(
          'select',
          t.memberExpression(t.identifier('args'), t.identifier('select')),
        ),
      ]);
      const pCallArgs = hasArgs
        ? [
            hasRequiredArgs
              ? t.tsNonNullExpression(t.identifier('variables'))
              : t.identifier('variables'),
            selectArgExpr,
          ]
        : [selectArgExpr];
      const prefetchQueryCall = callExpr(
        t.memberExpression(
          t.identifier('queryClient'),
          t.identifier('prefetchQuery'),
        ),
        [
          t.objectExpression([
            objectProp('queryKey', buildQueryKeyCall(hasArgs)),
            objectProp(
              'queryFn',
              t.arrowFunctionExpression(
                [],
                getClientCustomCallUnwrap(
                  'query',
                  operation.name,
                  pCallArgs as t.Expression[],
                ),
              ),
            ),
          ]),
        ],
      );
      pBody.push(t.expressionStatement(t.awaitExpression(prefetchQueryCall)));
      statements.push(
        exportAsyncFunction(
          prefetchFnName,
          null,
          [
            createFunctionParam('queryClient', typeRef('QueryClient')),
            createFunctionParam(
              'params',
              t.tsTypeLiteral(pImplProps),
              false,
            ),
          ],
          pBody,
          typeRef('Promise', [t.tsVoidKeyword()]),
        ),
      );
    } else {
      // Without select
      const pBody: t.Statement[] = [];
      const pParams: t.Identifier[] = [
        createFunctionParam('queryClient', typeRef('QueryClient')),
      ];

      if (hasArgs) {
        const pProps: t.TSPropertySignature[] = [];
        const varProp = t.tsPropertySignature(
          t.identifier('variables'),
          t.tsTypeAnnotation(typeRef(varTypeName)),
        );
        if (!hasRequiredArgs) varProp.optional = true;
        pProps.push(varProp);
        pParams.push(
          createFunctionParam(
            'params',
            t.tsTypeLiteral(pProps),
            !hasRequiredArgs,
          ),
        );
        pBody.push(
          constDecl(
            'variables',
            hasRequiredArgs
              ? t.optionalMemberExpression(
                  t.identifier('params'),
                  t.identifier('variables'),
                  false,
                  true,
                )
              : t.logicalExpression(
                  '??',
                  t.optionalMemberExpression(
                    t.identifier('params'),
                    t.identifier('variables'),
                    false,
                    true,
                  ),
                  t.objectExpression([]),
                ),
          ),
        );
        const pCallArgs = hasRequiredArgs
          ? [t.tsNonNullExpression(t.identifier('variables'))]
          : [t.identifier('variables')];
        const prefetchQueryCall = callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('prefetchQuery'),
          ),
          [
            t.objectExpression([
              objectProp('queryKey', buildQueryKeyCall(true)),
              objectProp(
                'queryFn',
                t.arrowFunctionExpression(
                  [],
                  getClientCustomCallUnwrap(
                    'query',
                    operation.name,
                    pCallArgs as t.Expression[],
                  ),
                ),
              ),
            ]),
          ],
        );
        pBody.push(t.expressionStatement(t.awaitExpression(prefetchQueryCall)));
      } else {
        const prefetchQueryCall = callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('prefetchQuery'),
          ),
          [
            t.objectExpression([
              objectProp('queryKey', buildQueryKeyCall(false)),
              objectProp(
                'queryFn',
                t.arrowFunctionExpression(
                  [],
                  getClientCustomCallUnwrap('query', operation.name, []),
                ),
              ),
            ]),
          ],
        );
        pBody.push(t.expressionStatement(t.awaitExpression(prefetchQueryCall)));
      }

      const pDecl = exportAsyncFunction(
        prefetchFnName,
        null,
        pParams,
        pBody,
        typeRef('Promise', [t.tsVoidKeyword()]),
      );
      addJSDocComment(pDecl, [
        `Prefetch ${operation.name} for SSR or cache warming`,
        '',
        '@example',
        '```ts',
        `await ${prefetchExampleCall};`,
        '```',
      ]);
      statements.push(pDecl);
    }
  }

  const headerText = reactQueryEnabled
    ? `Custom query hook for ${operation.name}`
    : `Custom query functions for ${operation.name}`;
  const content = generateHookFileCode(headerText, statements);

  return {
    fileName,
    content,
    operationName: operation.name,
  };
}

export interface GenerateAllCustomQueryHooksOptions {
  operations: CleanOperation[];
  typeRegistry: TypeRegistry;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateAllCustomQueryHooks(
  options: GenerateAllCustomQueryHooksOptions,
): GeneratedCustomQueryFile[] {
  const {
    operations,
    typeRegistry,
    skipQueryField = true,
    reactQueryEnabled = true,
    tableTypeNames,
    useCentralizedKeys = true,
  } = options;

  return operations
    .filter((op) => op.kind === 'query')
    .map((operation) =>
      generateCustomQueryHook({
        operation,
        typeRegistry,
        skipQueryField,
        reactQueryEnabled,
        tableTypeNames,
        useCentralizedKeys,
      }),
    );
}
