import * as t from '@babel/types';

import { generateCode } from '../babel-ast';
import { getGeneratedFileHeader } from '../utils';

export interface GeneratedFile {
  fileName: string;
  content: string;
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
