/**
 * Subscription hook generators - delegates to ORM model subscribe methods.
 */
import * as t from '@babel/types';

import type { Table } from '../../types/schema';
import { typeRefToBabelType } from './babel-ast';
import {
  addJSDocComment,
  callExpr,
  constDecl,
  createFunctionParam,
  createImportDeclaration,
  createTypeReExport,
  exportFunction,
  generateHookFileCode,
  objectProp,
  typeRef,
} from './hooks-ast';
import {
  getSubscriptionFileName,
  getSubscriptionHookName,
  getTableNames,
  lcFirst,
} from './utils';

export interface GeneratedSubscriptionFile {
  fileName: string;
  content: string;
}

function inferSelectResultType(entityType: string, selectType: t.TSType): t.TSType {
  return t.tsTypeReference(
    t.identifier('InferSelectResult'),
    t.tsTypeParameterInstantiation([typeRef(entityType), selectType]),
  );
}

/**
 * Generate a subscription hook for a table.
 */
export function generateSubscriptionHook(
  table: Table,
): GeneratedSubscriptionFile {
  if (!table.subscription) {
    throw new Error(
      `Cannot generate subscription hook for ${table.name}: missing subscription metadata.`,
    );
  }

  const { typeName, singularName } = getTableNames(table);
  const hookName = getSubscriptionHookName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const optionsTypeName = `${typeName}SubscriptionOptions`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const selectedType = inferSelectResultType(relationTypeName, typeRef('S'));

  const statements: t.Statement[] = [];

  statements.push(createImportDeclaration('react', ['useEffect', 'useMemo', 'useRef']));
  statements.push(
    createImportDeclaration('@tanstack/react-query', ['useQueryClient']),
  );
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration(
      '../../orm/client',
      ['SubscriptionEvent'],
      true,
    ),
  );
  statements.push(
    createImportDeclaration(
      '../../orm/input-types',
      [selectTypeName, relationTypeName],
      true,
    ),
  );
  statements.push(
    createImportDeclaration(
      '../../orm/select-types',
      ['InferSelectResult', 'StrictSelect'],
      true,
    ),
  );
  statements.push(createImportDeclaration('../query-keys', [keysName]));
  statements.push(
    createTypeReExport(
      ['SubscriptionEvent', 'Unsubscribe'],
      '../../orm/client',
    ),
  );
  statements.push(
    createTypeReExport(
      [selectTypeName, relationTypeName],
      '../../orm/input-types',
    ),
  );

  const optionsProps: t.TSPropertySignature[] = [
    t.tsPropertySignature(
      t.identifier('select'),
      t.tsTypeAnnotation(typeRef('S')),
    ),
    ...table.subscription.args.map((arg) => {
      const prop = t.tsPropertySignature(
        t.identifier(arg.name),
        t.tsTypeAnnotation(typeRefToBabelType(arg.type)),
      );
      prop.optional = arg.type.kind !== 'NON_NULL';
      return prop;
    }),
    t.tsPropertySignature(
      t.identifier('onEvent'),
      t.tsTypeAnnotation(
        t.tsFunctionType(
          null,
          [createFunctionParam('event', typeRef('SubscriptionEvent', [selectedType]))],
          t.tsTypeAnnotation(t.tsVoidKeyword()),
        ),
      ),
    ),
    (() => {
      const prop = t.tsPropertySignature(
        t.identifier('onError'),
        t.tsTypeAnnotation(
          t.tsFunctionType(
            null,
            [createFunctionParam('error', typeRef('Error'))],
            t.tsTypeAnnotation(t.tsVoidKeyword()),
          ),
        ),
      );
      prop.optional = true;
      return prop;
    })(),
    (() => {
      const prop = t.tsPropertySignature(
        t.identifier('onComplete'),
        t.tsTypeAnnotation(
          t.tsFunctionType(
            null,
            [],
            t.tsTypeAnnotation(t.tsVoidKeyword()),
          ),
        ),
      );
      prop.optional = true;
      return prop;
    })(),
    (() => {
      const prop = t.tsPropertySignature(
        t.identifier('enabled'),
        t.tsTypeAnnotation(t.tsBooleanKeyword()),
      );
      prop.optional = true;
      return prop;
    })(),
    (() => {
      const prop = t.tsPropertySignature(
        t.identifier('invalidateQueries'),
        t.tsTypeAnnotation(t.tsBooleanKeyword()),
      );
      prop.optional = true;
      return prop;
    })(),
  ];

  const optionsAlias = t.tsTypeAliasDeclaration(
    t.identifier(optionsTypeName),
    t.tsTypeParameterDeclaration([
      t.tsTypeParameter(typeRef(selectTypeName), null, 'S'),
    ]),
    t.tsIntersectionType([
      t.tsTypeLiteral(optionsProps),
      typeRef('StrictSelect', [typeRef('S'), typeRef(selectTypeName)]),
    ]),
  );
  statements.push(t.exportNamedDeclaration(optionsAlias));

  const hookBody: t.Statement[] = [];
  hookBody.push(constDecl('queryClient', callExpr('useQueryClient', [])));
  hookBody.push(constDecl('optionsRef', callExpr('useRef', [t.identifier('options')])));
  hookBody.push(
    t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(t.identifier('optionsRef'), t.identifier('current')),
        t.identifier('options'),
      ),
    ),
  );
  // The combined subscribeKey covers select + every subscription arg so callers
  // passing `ids={[userId]}` inline do not re-subscribe every render.
  const subscribeKeyObjProps: (t.ObjectProperty | t.SpreadElement | t.ObjectMethod)[] = [
    objectProp(
      'select',
      t.memberExpression(t.identifier('options'), t.identifier('select')),
    ),
    ...table.subscription.args.map((arg) =>
      objectProp(
        arg.name,
        t.memberExpression(t.identifier('options'), t.identifier(arg.name)),
      ),
    ),
  ];
  const subscribeKeyDeps: t.Expression[] = [
    t.memberExpression(t.identifier('options'), t.identifier('select')),
    ...table.subscription.args.map((arg) =>
      t.memberExpression(t.identifier('options'), t.identifier(arg.name)),
    ),
  ];
  hookBody.push(
    constDecl(
      'subscribeKey',
      callExpr('useMemo', [
        t.arrowFunctionExpression(
          [],
          t.callExpression(
            t.memberExpression(
              t.identifier('JSON'),
              t.identifier('stringify'),
            ),
            [t.objectExpression(subscribeKeyObjProps)],
          ),
        ),
        t.arrayExpression(subscribeKeyDeps),
      ]),
    ),
  );

  const effectBody: t.Statement[] = [];
  effectBody.push(
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.memberExpression(t.identifier('options'), t.identifier('enabled')),
        t.booleanLiteral(false),
      ),
      t.returnStatement(null),
    ),
  );
  effectBody.push(constDecl('client', callExpr('getClient', [])));

  // Build the subscribe argument by spreading options then overriding the callbacks with
  // wrapped versions. Spreading (not Object.assign) preserves the type intersection
  // (including StrictSelect proof) without any `as` cast or `any`. The wrapped callbacks
  // read from optionsRef.current so stale-closure issues are avoided inside useEffect.
  const wrappedOnEvent = t.arrowFunctionExpression(
    [createFunctionParam('event', typeRef('SubscriptionEvent', [inferSelectResultType(relationTypeName, typeRef('S'))]))],
    t.blockStatement([
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.memberExpression(t.identifier('optionsRef'), t.identifier('current')),
            t.identifier('onEvent'),
          ),
          [t.identifier('event')],
        ),
      ),
      t.ifStatement(
        t.binaryExpression(
          '!==',
          t.memberExpression(
            t.memberExpression(t.identifier('optionsRef'), t.identifier('current')),
            t.identifier('invalidateQueries'),
          ),
          t.booleanLiteral(false),
        ),
        t.expressionStatement(
          callExpr(
            t.memberExpression(t.identifier('queryClient'), t.identifier('invalidateQueries')),
            [
              t.objectExpression([
                objectProp(
                  'queryKey',
                  t.memberExpression(t.identifier(keysName), t.identifier('all')),
                ),
              ]),
            ],
          ),
        ),
      ),
    ]),
  );
  const wrappedOnError = t.arrowFunctionExpression(
    [createFunctionParam('error', typeRef('Error'))],
    t.optionalCallExpression(
      t.memberExpression(
        t.memberExpression(t.identifier('optionsRef'), t.identifier('current')),
        t.identifier('onError'),
      ),
      [t.identifier('error')],
      true,
    ),
  );
  const wrappedOnComplete = t.arrowFunctionExpression(
    [],
    t.optionalCallExpression(
      t.memberExpression(
        t.memberExpression(t.identifier('optionsRef'), t.identifier('current')),
        t.identifier('onComplete'),
      ),
      [],
      true,
    ),
  );
  const subscribeArg = t.objectExpression([
    t.spreadElement(t.identifier('options')),
    objectProp('onEvent', wrappedOnEvent),
    objectProp('onError', wrappedOnError),
    objectProp('onComplete', wrappedOnComplete),
  ]);

  effectBody.push(
    constDecl(
      'unsubscribe',
      (() => {
        const expr = callExpr(
        t.memberExpression(
          t.memberExpression(t.identifier('client'), t.identifier(singularName)),
          t.identifier('subscribe'),
        ),
        [subscribeArg],
        );
        expr.typeParameters = t.tsTypeParameterInstantiation([typeRef('S')]);
        return expr;
      })(),
    ),
  );
  effectBody.push(
    t.returnStatement(
      t.arrowFunctionExpression(
        [],
        t.callExpression(t.identifier('unsubscribe'), []),
      ),
    ),
  );

  hookBody.push(
    t.expressionStatement(
      callExpr('useEffect', [
        t.arrowFunctionExpression([], t.blockStatement(effectBody)),
        t.arrayExpression([
          t.memberExpression(t.identifier('options'), t.identifier('enabled')),
          t.identifier('subscribeKey'),
          t.identifier('queryClient'),
        ]),
      ]),
    ),
  );

  const hookDecl = exportFunction(
    hookName,
    t.tsTypeParameterDeclaration([
      t.tsTypeParameter(typeRef(selectTypeName), null, 'S'),
    ]),
    [createFunctionParam('options', typeRef(optionsTypeName, [typeRef('S')]))],
    hookBody,
    t.tsVoidKeyword(),
  );
  addJSDocComment(hookDecl, [
    `Subscription hook for ${typeName} realtime events`,
    '',
    `Delegates to getClient().${singularName}.subscribe().`,
  ]);
  statements.push(hookDecl);

  return {
    fileName: getSubscriptionFileName(table),
    content: generateHookFileCode(
      `Subscription hook for ${typeName}`,
      statements,
    ),
  };
}

/**
 * Generate the useConnectionState hook file.
 */
export function generateConnectionStateHook(): GeneratedSubscriptionFile {
  const statements: t.Statement[] = [];
  statements.push(createImportDeclaration('react', ['useState', 'useEffect']));
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration('../../orm/client', ['ConnectionState'], true),
  );
  statements.push(createTypeReExport(['ConnectionState'], '../../orm/client'));

  const hookBody: t.Statement[] = [];
  const initFn = t.arrowFunctionExpression(
    [],
    t.memberExpression(
      t.memberExpression(callExpr('getClient', []), t.identifier('realtime')),
      t.identifier('connectionState'),
    ),
  );
  const useStateCall = callExpr('useState', [initFn]);
  useStateCall.typeParameters = t.tsTypeParameterInstantiation([
    typeRef('ConnectionState'),
  ]);
  hookBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.arrayPattern([t.identifier('state'), t.identifier('setState')]),
        useStateCall,
      ),
    ]),
  );

  const effectBody: t.Statement[] = [];
  effectBody.push(constDecl('client', callExpr('getClient', [])));
  effectBody.push(
    t.ifStatement(
      t.unaryExpression(
        '!',
        t.memberExpression(
          t.memberExpression(t.identifier('client'), t.identifier('realtime')),
          t.identifier('isEnabled'),
        ),
      ),
      t.returnStatement(null),
    ),
  );
  effectBody.push(
    constDecl(
      'unsubscribe',
      callExpr(
        t.memberExpression(
          t.memberExpression(t.identifier('client'), t.identifier('realtime')),
          t.identifier('onConnectionStateChange'),
        ),
        [t.identifier('setState')],
      ),
    ),
  );
  effectBody.push(
    t.returnStatement(
      t.arrowFunctionExpression(
        [],
        t.callExpression(t.identifier('unsubscribe'), []),
      ),
    ),
  );
  hookBody.push(
    t.expressionStatement(
      callExpr('useEffect', [
        t.arrowFunctionExpression([], t.blockStatement(effectBody)),
        t.arrayExpression([]),
      ]),
    ),
  );
  hookBody.push(t.returnStatement(t.identifier('state')));

  const hookDecl = exportFunction(
    'useConnectionState',
    null,
    [],
    hookBody,
    typeRef('ConnectionState'),
  );
  addJSDocComment(hookDecl, ['Hook to observe the WebSocket connection state.']);
  statements.push(hookDecl);

  return {
    fileName: 'useConnectionState.ts',
    content: generateHookFileCode(
      'WebSocket connection state hook',
      statements,
    ),
  };
}

export function generateAllSubscriptionHooks(
  tables: Table[],
): GeneratedSubscriptionFile[] {
  return tables.map((table) => generateSubscriptionHook(table));
}
