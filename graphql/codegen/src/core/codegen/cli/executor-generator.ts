import * as t from '@babel/types';

import { generateCode } from '../babel-ast';
import { getGeneratedFileHeader } from '../utils';

export interface GeneratedFile {
  fileName: string;
  content: string;
}

export interface MultiTargetExecutorInput {
  name: string;
  endpoint: string;
  ormImportPath: string;
}

function createImportDeclaration(
  moduleSpecifier: string,
  namedImports: string[],
  typeOnly: boolean = false,
): t.ImportDeclaration {
  const specifiers = namedImports.map((name) =>
    t.importSpecifier(t.identifier(name), t.identifier(name)),
  );
  const decl = t.importDeclaration(
    specifiers,
    t.stringLiteral(moduleSpecifier),
  );
  decl.importKind = typeOnly ? 'type' : 'value';
  return decl;
}

export function generateExecutorFile(toolName: string): GeneratedFile {
  const statements: t.Statement[] = [];

  statements.push(
    createImportDeclaration('appstash', ['createConfigStore']),
  );
  statements.push(
    createImportDeclaration('../orm', ['createClient']),
  );

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('store'),
        t.callExpression(t.identifier('createConfigStore'), [
          t.stringLiteral(toolName),
        ]),
      ),
    ]),
  );

  const getStoreExport = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('getStore'),
      t.arrowFunctionExpression([], t.identifier('store')),
    ),
  ]);
  statements.push(t.exportNamedDeclaration(getStoreExport));

  const contextNameParam = t.identifier('contextName');
  contextNameParam.optional = true;
  contextNameParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

  const getClientBody = t.blockStatement([
    t.variableDeclaration('let', [
      t.variableDeclarator(t.identifier('ctx'), t.nullLiteral()),
    ]),
    t.ifStatement(
      t.identifier('contextName'),
      t.blockStatement([
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.identifier('ctx'),
            t.callExpression(
              t.memberExpression(
                t.identifier('store'),
                t.identifier('loadContext'),
              ),
              [t.identifier('contextName')],
            ),
          ),
        ),
        t.ifStatement(
          t.unaryExpression('!', t.identifier('ctx')),
          t.blockStatement([
            t.throwStatement(
              t.newExpression(t.identifier('Error'), [
                t.templateLiteral(
                  [
                    t.templateElement({ raw: 'Context "', cooked: 'Context "' }),
                    t.templateElement({ raw: '" not found.', cooked: '" not found.' }, true),
                  ],
                  [t.identifier('contextName')],
                ),
              ]),
            ),
          ]),
        ),
      ]),
      t.blockStatement([
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.identifier('ctx'),
            t.callExpression(
              t.memberExpression(
                t.identifier('store'),
                t.identifier('getCurrentContext'),
              ),
              [],
            ),
          ),
        ),
        t.ifStatement(
          t.unaryExpression('!', t.identifier('ctx')),
          t.blockStatement([
            t.throwStatement(
              t.newExpression(t.identifier('Error'), [
                t.stringLiteral(
                  'No active context. Run "context create" or "context use" first.',
                ),
              ]),
            ),
          ]),
        ),
      ]),
    ),

    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('headers'),
        t.objectExpression([]),
      ),
    ]),

    t.ifStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('hasValidCredentials'),
        ),
        [t.memberExpression(t.identifier('ctx'), t.identifier('name'))],
      ),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('creds'),
            t.callExpression(
              t.memberExpression(
                t.identifier('store'),
                t.identifier('getCredentials'),
              ),
              [t.memberExpression(t.identifier('ctx'), t.identifier('name'))],
            ),
          ),
        ]),
        t.ifStatement(
          t.optionalMemberExpression(
            t.identifier('creds'),
            t.identifier('token'),
            false,
            true,
          ),
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier('headers'),
                  t.identifier('Authorization'),
                ),
                t.templateLiteral(
                  [
                    t.templateElement({ raw: 'Bearer ', cooked: 'Bearer ' }),
                    t.templateElement({ raw: '', cooked: '' }, true),
                  ],
                  [
                    t.memberExpression(
                      t.identifier('creds'),
                      t.identifier('token'),
                    ),
                  ],
                ),
              ),
            ),
          ]),
        ),
      ]),
    ),

    t.returnStatement(
      t.callExpression(t.identifier('createClient'), [
        t.objectExpression([
          t.objectProperty(
            t.identifier('endpoint'),
            t.memberExpression(t.identifier('ctx'), t.identifier('endpoint')),
          ),
          t.objectProperty(
            t.identifier('headers'),
            t.identifier('headers'),
          ),
        ]),
      ]),
    ),
  ]);

  const getClientFunc = t.functionDeclaration(
    t.identifier('getClient'),
    [contextNameParam],
    getClientBody,
  );
  statements.push(t.exportNamedDeclaration(getClientFunc));

  const header = getGeneratedFileHeader('Executor and config store for CLI');
  const code = generateCode(statements);

  return {
    fileName: 'executor.ts',
    content: header + '\n' + code,
  };
}

export function generateMultiTargetExecutorFile(
  toolName: string,
  targets: MultiTargetExecutorInput[],
): GeneratedFile {
  const statements: t.Statement[] = [];

  statements.push(
    createImportDeclaration('appstash', ['createConfigStore']),
  );

  for (const target of targets) {
    const aliasName = `create${target.name[0].toUpperCase()}${target.name.slice(1)}Client`;
    const specifier = t.importSpecifier(
      t.identifier(aliasName),
      t.identifier('createClient'),
    );
    statements.push(
      t.importDeclaration([specifier], t.stringLiteral(target.ormImportPath)),
    );
  }

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('store'),
        t.callExpression(t.identifier('createConfigStore'), [
          t.stringLiteral(toolName),
        ]),
      ),
    ]),
  );

  const getStoreExport = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('getStore'),
      t.arrowFunctionExpression([], t.identifier('store')),
    ),
  ]);
  statements.push(t.exportNamedDeclaration(getStoreExport));

  const targetClientsProps = targets.map((target) => {
    const aliasName = `create${target.name[0].toUpperCase()}${target.name.slice(1)}Client`;
    return t.objectProperty(
      t.stringLiteral(target.name),
      t.identifier(aliasName),
    );
  });
  const targetClientsDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('targetClients'),
      t.objectExpression(targetClientsProps),
    ),
  ]);
  statements.push(targetClientsDecl);

  const defaultEndpointProps = targets.map((target) =>
    t.objectProperty(
      t.stringLiteral(target.name),
      t.stringLiteral(target.endpoint),
    ),
  );
  const defaultEndpointsDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('defaultEndpoints'),
      t.objectExpression(defaultEndpointProps),
    ),
  ]);
  statements.push(defaultEndpointsDecl);

  const getTargetNamesFunc = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('getTargetNames'),
      t.arrowFunctionExpression(
        [],
        t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('keys')),
          [t.identifier('targetClients')],
        ),
      ),
    ),
  ]);
  statements.push(t.exportNamedDeclaration(getTargetNamesFunc));

  const getDefaultEndpointParam = t.identifier('targetName');
  getDefaultEndpointParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const getDefaultEndpointFunc = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('getDefaultEndpoint'),
      t.arrowFunctionExpression(
        [getDefaultEndpointParam],
        t.logicalExpression(
          '||',
          t.memberExpression(
            t.identifier('defaultEndpoints'),
            t.identifier('targetName'),
            true,
          ),
          t.stringLiteral(''),
        ),
      ),
    ),
  ]);
  statements.push(t.exportNamedDeclaration(getDefaultEndpointFunc));

  const targetNameParam = t.identifier('targetName');
  targetNameParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const contextNameParam = t.identifier('contextName');
  contextNameParam.optional = true;
  contextNameParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

  const getClientBody = t.blockStatement([
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('createFn'),
        t.memberExpression(
          t.identifier('targetClients'),
          t.identifier('targetName'),
          true,
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('createFn')),
      t.blockStatement([
        t.throwStatement(
          t.newExpression(t.identifier('Error'), [
            t.templateLiteral(
              [
                t.templateElement({ raw: 'Unknown target: ', cooked: 'Unknown target: ' }),
                t.templateElement({ raw: '', cooked: '' }, true),
              ],
              [t.identifier('targetName')],
            ),
          ]),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('headers'),
        t.objectExpression([]),
      ),
    ]),
    t.variableDeclaration('let', [
      t.variableDeclarator(t.identifier('endpoint'), t.stringLiteral('')),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('ctx'),
        t.conditionalExpression(
          t.identifier('contextName'),
          t.callExpression(
            t.memberExpression(t.identifier('store'), t.identifier('loadContext')),
            [t.identifier('contextName')],
          ),
          t.callExpression(
            t.memberExpression(t.identifier('store'), t.identifier('getCurrentContext')),
            [],
          ),
        ),
      ),
    ]),
    t.ifStatement(
      t.identifier('ctx'),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('resolved'),
            t.callExpression(
              t.memberExpression(t.identifier('store'), t.identifier('getTargetEndpoint')),
              [t.identifier('targetName'), t.memberExpression(t.identifier('ctx'), t.identifier('name'))],
            ),
          ),
        ]),
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.identifier('endpoint'),
            t.logicalExpression(
              '||',
              t.identifier('resolved'),
              t.logicalExpression(
                '||',
                t.memberExpression(
                  t.identifier('defaultEndpoints'),
                  t.identifier('targetName'),
                  true,
                ),
                t.stringLiteral(''),
              ),
            ),
          ),
        ),
        t.ifStatement(
          t.callExpression(
            t.memberExpression(t.identifier('store'), t.identifier('hasValidCredentials')),
            [t.memberExpression(t.identifier('ctx'), t.identifier('name'))],
          ),
          t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('creds'),
                t.callExpression(
                  t.memberExpression(t.identifier('store'), t.identifier('getCredentials')),
                  [t.memberExpression(t.identifier('ctx'), t.identifier('name'))],
                ),
              ),
            ]),
            t.ifStatement(
              t.optionalMemberExpression(
                t.identifier('creds'),
                t.identifier('token'),
                false,
                true,
              ),
              t.blockStatement([
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(t.identifier('headers'), t.identifier('Authorization')),
                    t.templateLiteral(
                      [
                        t.templateElement({ raw: 'Bearer ', cooked: 'Bearer ' }),
                        t.templateElement({ raw: '', cooked: '' }, true),
                      ],
                      [t.memberExpression(t.identifier('creds'), t.identifier('token'))],
                    ),
                  ),
                ),
              ]),
            ),
          ]),
        ),
      ]),
      t.blockStatement([
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.identifier('endpoint'),
            t.logicalExpression(
              '||',
              t.memberExpression(
                t.identifier('defaultEndpoints'),
                t.identifier('targetName'),
                true,
              ),
              t.stringLiteral(''),
            ),
          ),
        ),
      ]),
    ),
    t.returnStatement(
      t.callExpression(t.identifier('createFn'), [
        t.objectExpression([
          t.objectProperty(t.identifier('endpoint'), t.identifier('endpoint')),
          t.objectProperty(t.identifier('headers'), t.identifier('headers')),
        ]),
      ]),
    ),
  ]);

  const getClientFunc = t.functionDeclaration(
    t.identifier('getClient'),
    [targetNameParam, contextNameParam],
    getClientBody,
  );
  statements.push(t.exportNamedDeclaration(getClientFunc));

  const header = getGeneratedFileHeader('Multi-target executor and config store for CLI');
  const code = generateCode(statements);

  return {
    fileName: 'executor.ts',
    content: header + '\n' + code,
  };
}
