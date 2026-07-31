/**
 * Subscription hook generators - delegates to ORM client subscribe (Babel AST-based)
 *
 * Output structure:
 * subscriptions/
 *   useContactSubscription.ts  - Subscription hook -> ORM client.subscribe()
 *   useConnectionState.ts      - Connection state hook
 */
import * as t from '@babel/types';

import type { Table } from '../../types/schema';
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
  getSubscriptionFieldName,
  getSubscriptionFileName,
  getSubscriptionHookName,
  getTableNames,
  lcFirst,
} from './utils';

export interface GeneratedSubscriptionFile {
  fileName: string;
  content: string;
}

/**
 * Generate a subscription hook for a table.
 *
 * Produces a React hook that calls `getClient().subscribe()` with the
 * correct subscription document, field metadata, and typed callbacks.
 *
 * Example generated output:
 * ```ts
 * export function useContactSubscription(options: ContactSubscriptionOptions): Unsubscribe {
 *   ...
 * }
 * ```
 */
export function generateSubscriptionHook(
  table: Table,
): GeneratedSubscriptionFile {
  const { typeName, singularName } = getTableNames(table);
  const hookName = getSubscriptionHookName(table);
  const subscriptionFieldName = getSubscriptionFieldName(table);
  const keysName = `${lcFirst(typeName)}Keys`;

  const statements: t.Statement[] = [];

  // Imports
  statements.push(
    createImportDeclaration('react', ['useEffect', 'useRef', 'useCallback']),
  );
  statements.push(
    createImportDeclaration('@tanstack/react-query', ['useQueryClient']),
  );
  statements.push(
    createImportDeclaration('@tanstack/react-query', ['QueryClient'], true),
  );
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration(
      '../../orm/client',
      [
        'SubscriptionEvent',
        'SubscriptionFieldMeta',
        'Unsubscribe',
      ],
      true,
    ),
  );
  statements.push(
    createImportDeclaration(
      '../../orm/input-types',
      [typeName],
      true,
    ),
  );
  statements.push(createImportDeclaration('../query-keys', [keysName]));

  // Re-export SubscriptionEvent for consumer convenience
  statements.push(
    createTypeReExport(
      ['SubscriptionEvent', 'Unsubscribe'],
      '../../orm/client',
    ),
  );

  // Subscription document constant
  const subscriptionDoc = `subscription On${typeName}Changed {
  ${subscriptionFieldName} {
    event
    ${singularName} { __typename }
    timestamp
  }
}`;
  const docDecl = constDecl(
    'SUBSCRIPTION_DOCUMENT',
    t.stringLiteral(subscriptionDoc),
  );
  statements.push(docDecl);

  // Field metadata constant
  const metaDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('FIELD_META'),
      t.objectExpression([
        objectProp('fieldName', t.stringLiteral(subscriptionFieldName)),
        objectProp('tableName', t.stringLiteral(singularName)),
        objectProp('dataFieldName', t.stringLiteral(singularName)),
      ]),
    ),
  ]);
  // Add type annotation: SubscriptionFieldMeta
  const metaId = metaDecl.declarations[0].id as t.Identifier;
  metaId.typeAnnotation = t.tsTypeAnnotation(
    typeRef('SubscriptionFieldMeta'),
  );
  statements.push(metaDecl);

  // Options interface
  const optionsTypeName = `${typeName}SubscriptionOptions`;
  const optionsInterface = t.tsInterfaceDeclaration(
    t.identifier(optionsTypeName),
    null,
    null,
    t.tsInterfaceBody([
      (() => {
        const p = t.tsPropertySignature(
          t.identifier('onEvent'),
          t.tsTypeAnnotation(
            t.tsFunctionType(
              null,
              [
                createFunctionParam(
                  'event',
                  typeRef('SubscriptionEvent', [typeRef(typeName)]),
                ),
              ],
              t.tsTypeAnnotation(t.tsVoidKeyword()),
            ),
          ),
        );
        return p;
      })(),
      (() => {
        const p = t.tsPropertySignature(
          t.identifier('onError'),
          t.tsTypeAnnotation(
            t.tsFunctionType(
              null,
              [createFunctionParam('error', typeRef('Error'))],
              t.tsTypeAnnotation(t.tsVoidKeyword()),
            ),
          ),
        );
        p.optional = true;
        return p;
      })(),
      (() => {
        const p = t.tsPropertySignature(
          t.identifier('enabled'),
          t.tsTypeAnnotation(t.tsBooleanKeyword()),
        );
        p.optional = true;
        return p;
      })(),
      (() => {
        const p = t.tsPropertySignature(
          t.identifier('invalidateQueries'),
          t.tsTypeAnnotation(t.tsBooleanKeyword()),
        );
        p.optional = true;
        return p;
      })(),
    ]),
  );
  statements.push(t.exportNamedDeclaration(optionsInterface));

  // Hook implementation
  const hookBody: t.Statement[] = [];

  // const queryClient = useQueryClient();
  hookBody.push(
    constDecl('queryClient', callExpr('useQueryClient', [])),
  );

  // const optionsRef = useRef(options);
  hookBody.push(
    constDecl('optionsRef', callExpr('useRef', [t.identifier('options')])),
  );

  // optionsRef.current = options;
  hookBody.push(
    t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(
          t.identifier('optionsRef'),
          t.identifier('current'),
        ),
        t.identifier('options'),
      ),
    ),
  );

  // useEffect with subscribe
  const effectBody: t.Statement[] = [];

  // if (options.enabled === false) return;
  effectBody.push(
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.memberExpression(
          t.identifier('options'),
          t.identifier('enabled'),
        ),
        t.booleanLiteral(false),
      ),
      t.returnStatement(null),
    ),
  );

  // const client = getClient();
  effectBody.push(
    constDecl('client', callExpr('getClient', [])),
  );

  // if (!client.isRealtimeEnabled) return;
  effectBody.push(
    t.ifStatement(
      t.unaryExpression(
        '!',
        t.memberExpression(
          t.identifier('client'),
          t.identifier('isRealtimeEnabled'),
        ),
      ),
      t.returnStatement(null),
    ),
  );

  // const unsubscribe = client.subscribe(FIELD_META, SUBSCRIPTION_DOCUMENT, {}, { onEvent, onError, onComplete });
  const subscribeCall = t.callExpression(
    t.memberExpression(
      t.identifier('client'),
      t.identifier('subscribe'),
    ),
    [
      t.identifier('FIELD_META'),
      t.identifier('SUBSCRIPTION_DOCUMENT'),
      t.objectExpression([]),
      t.objectExpression([
        objectProp(
          'onEvent',
          t.arrowFunctionExpression(
            [t.identifier('event')],
            t.blockStatement([
              // optionsRef.current.onEvent(event);
              t.expressionStatement(
                callExpr(
                  t.memberExpression(
                    t.memberExpression(
                      t.identifier('optionsRef'),
                      t.identifier('current'),
                    ),
                    t.identifier('onEvent'),
                  ),
                  [t.identifier('event')],
                ),
              ),
              // if (optionsRef.current.invalidateQueries !== false) { queryClient.invalidateQueries({ queryKey: keysName.all }); }
              t.ifStatement(
                t.binaryExpression(
                  '!==',
                  t.memberExpression(
                    t.memberExpression(
                      t.identifier('optionsRef'),
                      t.identifier('current'),
                    ),
                    t.identifier('invalidateQueries'),
                  ),
                  t.booleanLiteral(false),
                ),
                t.expressionStatement(
                  callExpr(
                    t.memberExpression(
                      t.identifier('queryClient'),
                      t.identifier('invalidateQueries'),
                    ),
                    [
                      t.objectExpression([
                        objectProp(
                          'queryKey',
                          t.memberExpression(
                            t.identifier(keysName),
                            t.identifier('all'),
                          ),
                        ),
                      ]),
                    ],
                  ),
                ),
              ),
            ]),
          ),
        ),
        objectProp(
          'onError',
          t.arrowFunctionExpression(
            [t.identifier('err')],
            t.blockStatement([
              t.expressionStatement(
                t.optionalCallExpression(
                  t.optionalMemberExpression(
                    t.memberExpression(
                      t.identifier('optionsRef'),
                      t.identifier('current'),
                    ),
                    t.identifier('onError'),
                    false,
                    true,
                  ),
                  [t.identifier('err')],
                  false,
                ),
              ),
            ]),
          ),
        ),
      ]),
    ],
  );
  effectBody.push(constDecl('unsubscribe', subscribeCall));

  // return () => unsubscribe();
  effectBody.push(
    t.returnStatement(
      t.arrowFunctionExpression(
        [],
        t.callExpression(t.identifier('unsubscribe'), []),
      ),
    ),
  );

  // useEffect(() => { ... }, [options.enabled]);
  const effectFn = t.arrowFunctionExpression(
    [],
    t.blockStatement(effectBody),
  );
  hookBody.push(
    t.expressionStatement(
      callExpr('useEffect', [
        effectFn,
        t.arrayExpression([
          t.memberExpression(
            t.identifier('options'),
            t.identifier('enabled'),
          ),
          t.identifier('queryClient'),
        ]),
      ]),
    ),
  );

  // Hook declaration
  const hookParam = createFunctionParam(
    'options',
    typeRef(optionsTypeName),
  );

  const hookDecl = exportFunction(
    hookName,
    null,
    [hookParam],
    hookBody,
    t.tsVoidKeyword(),
  );
  addJSDocComment(hookDecl, [
    `Subscription hook for ${typeName} realtime events`,
    '',
    'Subscribes to realtime changes on the server and automatically',
    'invalidates React Query cache when events are received.',
    '',
    '@example',
    '```tsx',
    `${hookName}({`,
    '  onEvent: (event) => {',
    `    console.log(event.operation, event.data);`,
    '  },',
    '});',
    '```',
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
 *
 * This hook exposes the WebSocket connection state from the ORM client
 * so UI components can show connection indicators.
 */
export function generateConnectionStateHook(): GeneratedSubscriptionFile {
  const statements: t.Statement[] = [];

  // Imports
  statements.push(
    createImportDeclaration('react', ['useState', 'useEffect']),
  );
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration(
      '../../orm/client',
      ['ConnectionState'],
      true,
    ),
  );

  // Re-export ConnectionState
  statements.push(
    createTypeReExport(['ConnectionState'], '../../orm/client'),
  );

  // Hook body
  const hookBody: t.Statement[] = [];

  // const [state, setState] = useState<ConnectionState>(() => getClient().getConnectionState());
  const initFn = t.arrowFunctionExpression(
    [],
    callExpr(
      t.memberExpression(
        callExpr('getClient', []),
        t.identifier('getConnectionState'),
      ),
      [],
    ),
  );
  const useStateCall = callExpr('useState', [initFn]);
  // @ts-ignore - typeParameters on CallExpression for TS
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

  // useEffect
  const effectBody: t.Statement[] = [];
  effectBody.push(
    constDecl('client', callExpr('getClient', [])),
  );

  // if (!client.isRealtimeEnabled) return;
  effectBody.push(
    t.ifStatement(
      t.unaryExpression(
        '!',
        t.memberExpression(
          t.identifier('client'),
          t.identifier('isRealtimeEnabled'),
        ),
      ),
      t.returnStatement(null),
    ),
  );

  // const unsubscribe = client.onConnectionStateChange(setState);
  effectBody.push(
    constDecl(
      'unsubscribe',
      callExpr(
        t.memberExpression(
          t.identifier('client'),
          t.identifier('onConnectionStateChange'),
        ),
        [t.identifier('setState')],
      ),
    ),
  );

  // return () => unsubscribe();
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

  // return state;
  hookBody.push(t.returnStatement(t.identifier('state')));

  // Hook declaration
  const hookDecl = exportFunction(
    'useConnectionState',
    null,
    [],
    hookBody,
    typeRef('ConnectionState'),
  );
  addJSDocComment(hookDecl, [
    'Hook to observe the WebSocket connection state.',
    '',
    'Returns the current connection state of the realtime WebSocket.',
    "Returns 'disconnected' if realtime is not configured.",
    '',
    '@example',
    '```tsx',
    'const state = useConnectionState();',
    "// state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'",
    '```',
  ]);
  statements.push(hookDecl);

  return {
    fileName: 'useConnectionState.ts',
    content: generateHookFileCode(
      'WebSocket connection state hook',
      statements,
    ),
  };
}

/**
 * Generate subscription hooks for all tables
 */
export function generateAllSubscriptionHooks(
  tables: Table[],
): GeneratedSubscriptionFile[] {
  return tables.map((table) => generateSubscriptionHook(table));
}
