/**
 * Custom query hook generators for non-table operations
 *
 * Generates hooks for operations discovered via schema introspection
 * that are NOT table CRUD operations (e.g., currentUser, nodeById, etc.)
 *
 * Output structure:
 * queries/
 *   useCurrentUserQuery.ts
 *   useNodeQuery.ts
 *   ...
 */
import type {
  CleanOperation,
  CleanArgument,
  TypeRegistry,
} from '../../types/schema';
import * as t from '@babel/types';
import { generateCode, addJSDocComment, typedParam, createTypedCallExpression } from './babel-ast';
import { buildCustomQueryString } from './schema-gql-ast';
import {
  typeRefToTsType,
  isTypeRequired,
  getOperationHookName,
  getOperationFileName,
  getOperationVariablesTypeName,
  getOperationResultTypeName,
  getDocumentConstName,
  getQueryKeyName,
  createTypeTracker,
  type TypeTracker,
} from './type-resolver';
import { ucFirst, getGeneratedFileHeader } from './utils';

export interface GeneratedCustomQueryFile {
  fileName: string;
  content: string;
  operationName: string;
}

export interface GenerateCustomQueryHookOptions {
  operation: CleanOperation;
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

interface VariablesProp {
  name: string;
  type: string;
  optional: boolean;
  docs?: string[];
}

function generateVariablesProperties(
  args: CleanArgument[],
  tracker?: TypeTracker
): VariablesProp[] {
  return args.map((arg) => ({
    name: arg.name,
    type: typeRefToTsType(arg.type, tracker),
    optional: !isTypeRequired(arg.type),
    docs: arg.description ? [arg.description] : undefined,
  }));
}

export function generateCustomQueryHook(
  options: GenerateCustomQueryHookOptions
): GeneratedCustomQueryFile {
  const {
    operation,
    typeRegistry,
    maxDepth = 2,
    skipQueryField = true,
    reactQueryEnabled = true,
    tableTypeNames,
    useCentralizedKeys = true,
  } = options;

  const hookName = getOperationHookName(operation.name, 'query');
  const fileName = getOperationFileName(operation.name, 'query');
  const variablesTypeName = getOperationVariablesTypeName(operation.name, 'query');
  const resultTypeName = getOperationResultTypeName(operation.name, 'query');
  const documentConstName = getDocumentConstName(operation.name, 'query');
  const queryKeyName = getQueryKeyName(operation.name);

  const tracker = createTypeTracker({ tableTypeNames });

  const queryDocument = buildCustomQueryString({
    operation,
    typeRegistry,
    maxDepth,
    skipQueryField,
  });

  const statements: t.Statement[] = [];

  const variablesProps =
    operation.args.length > 0
      ? generateVariablesProperties(operation.args, tracker)
      : [];

  const resultType = typeRefToTsType(operation.returnType, tracker);

  const schemaTypes = tracker.getImportableTypes();
  const tableTypes = tracker.getTableTypes();

  if (reactQueryEnabled) {
    const reactQueryImport = t.importDeclaration(
      [t.importSpecifier(t.identifier('useQuery'), t.identifier('useQuery'))],
      t.stringLiteral('@tanstack/react-query')
    );
    statements.push(reactQueryImport);
    const reactQueryTypeImport = t.importDeclaration(
      [
        t.importSpecifier(t.identifier('UseQueryOptions'), t.identifier('UseQueryOptions')),
        t.importSpecifier(t.identifier('QueryClient'), t.identifier('QueryClient')),
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
    [t.importSpecifier(t.identifier('ExecuteOptions'), t.identifier('ExecuteOptions'))],
    t.stringLiteral('../client')
  );
  clientTypeImport.importKind = 'type';
  statements.push(clientTypeImport);

  if (tableTypes.length > 0) {
    const typesImport = t.importDeclaration(
      tableTypes.map((tt) => t.importSpecifier(t.identifier(tt), t.identifier(tt))),
      t.stringLiteral('../types')
    );
    typesImport.importKind = 'type';
    statements.push(typesImport);
  }

  if (schemaTypes.length > 0) {
    const schemaTypesImport = t.importDeclaration(
      schemaTypes.map((st) => t.importSpecifier(t.identifier(st), t.identifier(st))),
      t.stringLiteral('../schema-types')
    );
    schemaTypesImport.importKind = 'type';
    statements.push(schemaTypesImport);
  }

  if (useCentralizedKeys) {
    const queryKeyImport = t.importDeclaration(
      [t.importSpecifier(t.identifier('customQueryKeys'), t.identifier('customQueryKeys'))],
      t.stringLiteral('../query-keys')
    );
    statements.push(queryKeyImport);
  }

  const queryDocConst = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier(documentConstName),
      t.templateLiteral(
        [t.templateElement({ raw: '\n' + queryDocument, cooked: '\n' + queryDocument }, true)],
        []
      )
    ),
  ]);
  const queryDocExport = t.exportNamedDeclaration(queryDocConst);
  addJSDocComment(queryDocExport, ['GraphQL query document']);
  statements.push(queryDocExport);

  if (operation.args.length > 0) {
    const variablesInterfaceProps = variablesProps.map((vp) => {
      const prop = t.tsPropertySignature(
        t.identifier(vp.name),
        t.tsTypeAnnotation(t.tsTypeReference(t.identifier(vp.type)))
      );
      prop.optional = vp.optional;
      return prop;
    });
    const variablesInterface = t.tsInterfaceDeclaration(
      t.identifier(variablesTypeName),
      null,
      null,
      t.tsInterfaceBody(variablesInterfaceProps)
    );
    statements.push(t.exportNamedDeclaration(variablesInterface));
  }

  const resultInterfaceBody = t.tsInterfaceBody([
    t.tsPropertySignature(
      t.identifier(operation.name),
      t.tsTypeAnnotation(t.tsTypeReference(t.identifier(resultType)))
    ),
  ]);
  const resultInterface = t.tsInterfaceDeclaration(
    t.identifier(resultTypeName),
    null,
    null,
    resultInterfaceBody
  );
  statements.push(t.exportNamedDeclaration(resultInterface));

  if (useCentralizedKeys) {
    const queryKeyConst = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(queryKeyName),
        t.memberExpression(t.identifier('customQueryKeys'), t.identifier(operation.name))
      ),
    ]);
    const queryKeyExport = t.exportNamedDeclaration(queryKeyConst);
    addJSDocComment(queryKeyExport, ['Query key factory - re-exported from query-keys.ts']);
    statements.push(queryKeyExport);
  } else if (operation.args.length > 0) {
    const queryKeyArrow = t.arrowFunctionExpression(
      [typedParam('variables', t.tsTypeReference(t.identifier(variablesTypeName)), true)],
      t.tsAsExpression(
        t.arrayExpression([t.stringLiteral(operation.name), t.identifier('variables')]),
        t.tsTypeReference(t.identifier('const'))
      )
    );
    const queryKeyConst = t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier(queryKeyName), queryKeyArrow),
    ]);
    const queryKeyExport = t.exportNamedDeclaration(queryKeyConst);
    addJSDocComment(queryKeyExport, ['Query key factory for caching']);
    statements.push(queryKeyExport);
  } else {
    const queryKeyArrow = t.arrowFunctionExpression(
      [],
      t.tsAsExpression(
        t.arrayExpression([t.stringLiteral(operation.name)]),
        t.tsTypeReference(t.identifier('const'))
      )
    );
    const queryKeyConst = t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier(queryKeyName), queryKeyArrow),
    ]);
    const queryKeyExport = t.exportNamedDeclaration(queryKeyConst);
    addJSDocComment(queryKeyExport, ['Query key factory for caching']);
    statements.push(queryKeyExport);
  }

  if (reactQueryEnabled) {
    const hasArgs = operation.args.length > 0;
    const hasRequiredArgs = operation.args.some((arg) => isTypeRequired(arg.type));

    const hookBodyStatements: t.Statement[] = [];
    const useQueryOptions: (t.ObjectProperty | t.SpreadElement)[] = [];

    if (hasArgs) {
      useQueryOptions.push(
        t.objectProperty(
          t.identifier('queryKey'),
          t.callExpression(t.identifier(queryKeyName), [t.identifier('variables')])
        )
      );
      useQueryOptions.push(
        t.objectProperty(
          t.identifier('queryFn'),
          t.arrowFunctionExpression(
            [],
            createTypedCallExpression(
              t.identifier('execute'),
              [t.identifier(documentConstName), t.identifier('variables')],
              [
                t.tsTypeReference(t.identifier(resultTypeName)),
                t.tsTypeReference(t.identifier(variablesTypeName)),
              ]
            )
          )
        )
      );
      if (hasRequiredArgs) {
        useQueryOptions.push(
          t.objectProperty(
            t.identifier('enabled'),
            t.logicalExpression(
              '&&',
              t.unaryExpression('!', t.unaryExpression('!', t.identifier('variables'))),
              t.binaryExpression(
                '!==',
                t.optionalMemberExpression(
                  t.identifier('options'),
                  t.identifier('enabled'),
                  false,
                  true
                ),
                t.booleanLiteral(false)
              )
            )
          )
        );
      }
    } else {
      useQueryOptions.push(
        t.objectProperty(
          t.identifier('queryKey'),
          t.callExpression(t.identifier(queryKeyName), [])
        )
      );
      useQueryOptions.push(
        t.objectProperty(
          t.identifier('queryFn'),
          t.arrowFunctionExpression(
            [],
            createTypedCallExpression(
              t.identifier('execute'),
              [t.identifier(documentConstName)],
              [t.tsTypeReference(t.identifier(resultTypeName))]
            )
          )
        )
      );
    }
    useQueryOptions.push(t.spreadElement(t.identifier('options')));

    hookBodyStatements.push(
      t.returnStatement(
        t.callExpression(t.identifier('useQuery'), [t.objectExpression(useQueryOptions)])
      )
    );

    const hookParams: t.Identifier[] = [];
    if (hasArgs) {
      hookParams.push(
        typedParam('variables', t.tsTypeReference(t.identifier(variablesTypeName)), !hasRequiredArgs)
      );
    }
    const optionsTypeStr = `Omit<UseQueryOptions<${resultTypeName}, Error>, 'queryKey' | 'queryFn'>`;
    const optionsParam = t.identifier('options');
    optionsParam.optional = true;
    optionsParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(optionsTypeStr)));
    hookParams.push(optionsParam);

    const hookFunc = t.functionDeclaration(
      t.identifier(hookName),
      hookParams,
      t.blockStatement(hookBodyStatements)
    );
    const hookExport = t.exportNamedDeclaration(hookFunc);

    const description = operation.description || `Query hook for ${operation.name}`;
    const argNames = operation.args.map((a) => a.name).join(', ');
    const exampleCall = hasArgs ? `${hookName}({ ${argNames} })` : `${hookName}()`;
    addJSDocComment(hookExport, [
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
    statements.push(hookExport);
  }

  const fetchFnName = `fetch${ucFirst(operation.name)}Query`;
  const hasArgs = operation.args.length > 0;
  const hasRequiredArgs = operation.args.some((arg) => isTypeRequired(arg.type));

  const fetchBodyStatements: t.Statement[] = [];
  if (hasArgs) {
    fetchBodyStatements.push(
      t.returnStatement(
        createTypedCallExpression(
          t.identifier('execute'),
          [t.identifier(documentConstName), t.identifier('variables'), t.identifier('options')],
          [
            t.tsTypeReference(t.identifier(resultTypeName)),
            t.tsTypeReference(t.identifier(variablesTypeName)),
          ]
        )
      )
    );
  } else {
    fetchBodyStatements.push(
      t.returnStatement(
        createTypedCallExpression(
          t.identifier('execute'),
          [t.identifier(documentConstName), t.identifier('undefined'), t.identifier('options')],
          [t.tsTypeReference(t.identifier(resultTypeName))]
        )
      )
    );
  }

  const fetchParams: t.Identifier[] = [];
  if (hasArgs) {
    fetchParams.push(
      typedParam('variables', t.tsTypeReference(t.identifier(variablesTypeName)), !hasRequiredArgs)
    );
  }
  fetchParams.push(typedParam('options', t.tsTypeReference(t.identifier('ExecuteOptions')), true));

  const fetchFunc = t.functionDeclaration(
    t.identifier(fetchFnName),
    fetchParams,
    t.blockStatement(fetchBodyStatements)
  );
  fetchFunc.async = true;
  fetchFunc.returnType = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Promise'),
      t.tsTypeParameterInstantiation([t.tsTypeReference(t.identifier(resultTypeName))])
    )
  );
  const fetchExport = t.exportNamedDeclaration(fetchFunc);

  const argNames = operation.args.map((a) => a.name).join(', ');
  const fetchExampleCall = hasArgs ? `${fetchFnName}({ ${argNames} })` : `${fetchFnName}()`;
  addJSDocComment(fetchExport, [
    `Fetch ${operation.name} without React hooks`,
    '',
    '@example',
    '```ts',
    `const data = await ${fetchExampleCall};`,
    '```',
  ]);
  statements.push(fetchExport);

  if (reactQueryEnabled) {
    const prefetchFnName = `prefetch${ucFirst(operation.name)}Query`;

    const prefetchBodyStatements: t.Statement[] = [];
    const prefetchQueryOptions: t.ObjectProperty[] = [];

    if (hasArgs) {
      prefetchQueryOptions.push(
        t.objectProperty(
          t.identifier('queryKey'),
          t.callExpression(t.identifier(queryKeyName), [t.identifier('variables')])
        )
      );
      prefetchQueryOptions.push(
        t.objectProperty(
          t.identifier('queryFn'),
          t.arrowFunctionExpression(
            [],
            createTypedCallExpression(
              t.identifier('execute'),
              [t.identifier(documentConstName), t.identifier('variables'), t.identifier('options')],
              [
                t.tsTypeReference(t.identifier(resultTypeName)),
                t.tsTypeReference(t.identifier(variablesTypeName)),
              ]
            )
          )
        )
      );
    } else {
      prefetchQueryOptions.push(
        t.objectProperty(
          t.identifier('queryKey'),
          t.callExpression(t.identifier(queryKeyName), [])
        )
      );
      prefetchQueryOptions.push(
        t.objectProperty(
          t.identifier('queryFn'),
          t.arrowFunctionExpression(
            [],
            createTypedCallExpression(
              t.identifier('execute'),
              [t.identifier(documentConstName), t.identifier('undefined'), t.identifier('options')],
              [t.tsTypeReference(t.identifier(resultTypeName))]
            )
          )
        )
      );
    }

    prefetchBodyStatements.push(
      t.expressionStatement(
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(t.identifier('queryClient'), t.identifier('prefetchQuery')),
            [t.objectExpression(prefetchQueryOptions)]
          )
        )
      )
    );

    const prefetchParams: t.Identifier[] = [
      typedParam('queryClient', t.tsTypeReference(t.identifier('QueryClient'))),
    ];
    if (hasArgs) {
      prefetchParams.push(
        typedParam('variables', t.tsTypeReference(t.identifier(variablesTypeName)), !hasRequiredArgs)
      );
    }
    prefetchParams.push(typedParam('options', t.tsTypeReference(t.identifier('ExecuteOptions')), true));

    const prefetchFunc = t.functionDeclaration(
      t.identifier(prefetchFnName),
      prefetchParams,
      t.blockStatement(prefetchBodyStatements)
    );
    prefetchFunc.async = true;
    prefetchFunc.returnType = t.tsTypeAnnotation(
      t.tsTypeReference(
        t.identifier('Promise'),
        t.tsTypeParameterInstantiation([t.tsVoidKeyword()])
      )
    );
    const prefetchExport = t.exportNamedDeclaration(prefetchFunc);

    const prefetchExampleCall = hasArgs
      ? `${prefetchFnName}(queryClient, { ${argNames} })`
      : `${prefetchFnName}(queryClient)`;
    addJSDocComment(prefetchExport, [
      `Prefetch ${operation.name} for SSR or cache warming`,
      '',
      '@example',
      '```ts',
      `await ${prefetchExampleCall};`,
      '```',
    ]);
    statements.push(prefetchExport);
  }

  const code = generateCode(statements);
  const headerText = reactQueryEnabled
    ? `Custom query hook for ${operation.name}`
    : `Custom query functions for ${operation.name}`;
  const content = getGeneratedFileHeader(headerText) + '\n\n' + code;

  return {
    fileName,
    content,
    operationName: operation.name,
  };
}

export interface GenerateAllCustomQueryHooksOptions {
  operations: CleanOperation[];
  typeRegistry: TypeRegistry;
  maxDepth?: number;
  skipQueryField?: boolean;
  reactQueryEnabled?: boolean;
  tableTypeNames?: Set<string>;
  useCentralizedKeys?: boolean;
}

export function generateAllCustomQueryHooks(
  options: GenerateAllCustomQueryHooksOptions
): GeneratedCustomQueryFile[] {
  const {
    operations,
    typeRegistry,
    maxDepth = 2,
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
        maxDepth,
        skipQueryField,
        reactQueryEnabled,
        tableTypeNames,
        useCentralizedKeys,
      })
    );
}
