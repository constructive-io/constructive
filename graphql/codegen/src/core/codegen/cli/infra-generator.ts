import * as t from '@babel/types';

import { generateCode } from '../babel-ast';
import { getGeneratedFileHeader } from '../utils';
import type { GeneratedFile } from './executor-generator';

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

function buildSwitchCase(
  testValue: string,
  handlerName: string,
  args: t.Expression[],
): t.SwitchCase {
  return t.switchCase(t.stringLiteral(testValue), [
    t.returnStatement(t.callExpression(t.identifier(handlerName), args)),
  ]);
}

function buildDefaultSwitchCase(usageVarName: string): t.SwitchCase {
  return t.switchCase(null, [
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [t.identifier(usageVarName)],
      ),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('process'), t.identifier('exit')),
        [t.numericLiteral(1)],
      ),
    ),
  ]);
}

function buildCommandHandler(
  params: t.Identifier[],
  body: t.Statement[],
  isAsync: boolean = true,
): t.FunctionDeclaration {
  const func = t.functionDeclaration(
    null,
    params,
    t.blockStatement(body),
    false,
    isAsync,
  );
  return func;
}

export function generateContextCommand(toolName: string): GeneratedFile {
  const statements: t.Statement[] = [];

  statements.push(
    createImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );
  statements.push(
    createImportDeclaration('../executor', ['getStore']),
  );

  const usageStr = `
${toolName} context <command>

Commands:
  create <name>         Create a new context
  list                  List all contexts
  use <name>            Set the active context
  current               Show current context
  delete <name>         Delete a context

Create Options:
  --endpoint <url>      GraphQL endpoint URL

  --help, -h            Show this help message
`;

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('usage'), t.stringLiteral(usageStr)),
    ]),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );

  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  const optionsParam = t.identifier('_options');
  optionsParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CLIOptions')),
  );

  const mainBody: t.Statement[] = [
    t.ifStatement(
      t.logicalExpression(
        '||',
        t.memberExpression(t.identifier('argv'), t.identifier('help')),
        t.memberExpression(t.identifier('argv'), t.identifier('h')),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [t.identifier('usage')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('store'),
        t.callExpression(t.identifier('getStore'), []),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier('first'),
            t.identifier('subcommand'),
          ),
          t.objectProperty(
            t.identifier('newArgv'),
            t.identifier('newArgv'),
            false,
            true,
          ),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('subcommand')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('autocomplete'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('subcommand'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('What do you want to do?'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.arrayExpression([
                          t.stringLiteral('create'),
                          t.stringLiteral('list'),
                          t.stringLiteral('use'),
                          t.stringLiteral('current'),
                          t.stringLiteral('delete'),
                        ]),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.returnStatement(
          t.callExpression(t.identifier('handleSubcommand'), [
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('subcommand'),
            ),
            t.identifier('newArgv'),
            t.identifier('prompter'),
            t.identifier('store'),
          ]),
        ),
      ]),
    ),
    t.returnStatement(
      t.callExpression(t.identifier('handleSubcommand'), [
        t.identifier('subcommand'),
        t.identifier('newArgv'),
        t.identifier('prompter'),
        t.identifier('store'),
      ]),
    ),
  ];

  const mainExport = t.exportDefaultDeclaration(
    t.arrowFunctionExpression(
      [argvParam, prompterParam, optionsParam],
      t.blockStatement(mainBody),
      true,
    ),
  );
  statements.push(mainExport);

  const subcmdParam = t.identifier('subcommand');
  subcmdParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const argvParam2 = t.identifier('argv');
  argvParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam2 = t.identifier('prompter');
  prompterParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const handleSubcommandFunc = t.functionDeclaration(
    t.identifier('handleSubcommand'),
    [subcmdParam, argvParam2, prompterParam2, storeParam],
    t.blockStatement([
      t.switchStatement(t.identifier('subcommand'), [
        buildSwitchCase('create', 'handleCreate', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('list', 'handleList', [t.identifier('store')]),
        buildSwitchCase('use', 'handleUse', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('current', 'handleCurrent', [t.identifier('store')]),
        buildSwitchCase('delete', 'handleDelete', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildDefaultSwitchCase('usage'),
      ]),
    ]),
    false,
    true,
  );
  statements.push(handleSubcommandFunc);

  statements.push(buildCreateHandler());
  statements.push(buildListHandler());
  statements.push(buildUseHandler());
  statements.push(buildCurrentHandler());
  statements.push(buildDeleteHandler());

  const header = getGeneratedFileHeader('Context management commands');
  const code = generateCode(statements);

  return {
    fileName: 'commands/context.ts',
    content: header + '\n' + code,
  };
}

function buildCreateHandler(): t.FunctionDeclaration {
  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('name')),
          t.objectProperty(
            t.identifier('newArgv'),
            t.identifier('restArgv'),
          ),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('answers'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('prompter'),
              t.identifier('prompt'),
            ),
            [
              t.objectExpression([
                t.objectProperty(
                  t.identifier('name'),
                  t.identifier('name'),
                  false,
                  true,
                ),
                t.spreadElement(t.identifier('restArgv')),
              ]),
              t.arrayExpression([
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('type'),
                    t.stringLiteral('text'),
                  ),
                  t.objectProperty(
                    t.identifier('name'),
                    t.stringLiteral('name'),
                  ),
                  t.objectProperty(
                    t.identifier('message'),
                    t.stringLiteral('Context name'),
                  ),
                  t.objectProperty(
                    t.identifier('required'),
                    t.booleanLiteral(true),
                  ),
                ]),
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('type'),
                    t.stringLiteral('text'),
                  ),
                  t.objectProperty(
                    t.identifier('name'),
                    t.stringLiteral('endpoint'),
                  ),
                  t.objectProperty(
                    t.identifier('message'),
                    t.stringLiteral('GraphQL endpoint URL'),
                  ),
                  t.objectProperty(
                    t.identifier('required'),
                    t.booleanLiteral(true),
                  ),
                ]),
              ]),
            ],
          ),
        ),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('contextName'),
        t.memberExpression(t.identifier('answers'), t.identifier('name')),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('endpoint'),
        t.memberExpression(
          t.identifier('answers'),
          t.identifier('endpoint'),
        ),
      ),
    ]),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('store'), t.identifier('createContext')),
        [
          t.identifier('contextName'),
          t.objectExpression([
            t.objectProperty(
              t.identifier('endpoint'),
              t.identifier('endpoint'),
            ),
          ]),
        ],
      ),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('settings'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('loadSettings'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression(
        '!',
        t.memberExpression(
          t.identifier('settings'),
          t.identifier('currentContext'),
        ),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('store'),
              t.identifier('setCurrentContext'),
            ),
            [t.identifier('contextName')],
          ),
        ),
      ]),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [
          t.templateLiteral(
            [
              t.templateElement({ raw: 'Created context: ', cooked: 'Created context: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [t.identifier('contextName')],
          ),
        ],
      ),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [
          t.templateLiteral(
            [
              t.templateElement({ raw: '  Endpoint: ', cooked: '  Endpoint: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [t.identifier('endpoint')],
          ),
        ],
      ),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleCreate'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
  return func;
}

function buildListHandler(): t.FunctionDeclaration {
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('contexts'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('listContexts'),
          ),
          [],
        ),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('settings'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('loadSettings'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.memberExpression(
          t.identifier('contexts'),
          t.identifier('length'),
        ),
        t.numericLiteral(0),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [t.stringLiteral('No contexts configured.')],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [t.stringLiteral('Contexts:')],
      ),
    ),
    t.forOfStatement(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('ctx')),
      ]),
      t.identifier('contexts'),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('marker'),
            t.conditionalExpression(
              t.binaryExpression(
                '===',
                t.memberExpression(
                  t.identifier('ctx'),
                  t.identifier('name'),
                ),
                t.memberExpression(
                  t.identifier('settings'),
                  t.identifier('currentContext'),
                ),
              ),
              t.stringLiteral('* '),
              t.stringLiteral('  '),
            ),
          ),
        ]),
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('authStatus'),
            t.conditionalExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('store'),
                  t.identifier('hasValidCredentials'),
                ),
                [
                  t.memberExpression(
                    t.identifier('ctx'),
                    t.identifier('name'),
                  ),
                ],
              ),
              t.stringLiteral('[authenticated]'),
              t.stringLiteral('[no token]'),
            ),
          ),
        ]),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: '', cooked: '' }),
                  t.templateElement({ raw: '', cooked: '' }),
                  t.templateElement({ raw: ' ', cooked: ' ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [
                  t.identifier('marker'),
                  t.memberExpression(
                    t.identifier('ctx'),
                    t.identifier('name'),
                  ),
                  t.identifier('authStatus'),
                ],
              ),
            ],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: '    Endpoint: ', cooked: '    Endpoint: ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [
                  t.memberExpression(
                    t.identifier('ctx'),
                    t.identifier('endpoint'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ]),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleList'),
    [storeParam],
    t.blockStatement(body),
  );
  return func;
}

function buildUseHandler(): t.FunctionDeclaration {
  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('name')),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('contexts'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('listContexts'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.memberExpression(
          t.identifier('contexts'),
          t.identifier('length'),
        ),
        t.numericLiteral(0),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [t.stringLiteral('No contexts configured.')],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    t.variableDeclaration('let', [
      t.variableDeclarator(
        t.identifier('contextName'),
        t.identifier('name'),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('contextName')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('autocomplete'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('name'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('Select context'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.callExpression(
                          t.memberExpression(
                            t.identifier('contexts'),
                            t.identifier('map'),
                          ),
                          [
                            t.arrowFunctionExpression(
                              [t.identifier('c')],
                              t.memberExpression(
                                t.identifier('c'),
                                t.identifier('name'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.identifier('contextName'),
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('name'),
            ),
          ),
        ),
      ]),
    ),
    t.ifStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('setCurrentContext'),
        ),
        [t.identifier('contextName')],
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: 'Switched to context: ', cooked: 'Switched to context: ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [t.identifier('contextName')],
              ),
            ],
          ),
        ),
      ]),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('error'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: 'Context "', cooked: 'Context "' }),
                  t.templateElement({ raw: '" not found.', cooked: '" not found.' }, true),
                ],
                [t.identifier('contextName')],
              ),
            ],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(1)],
          ),
        ),
      ]),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleUse'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
  return func;
}

function buildCurrentHandler(): t.FunctionDeclaration {
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('current'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('getCurrentContext'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('current')),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [t.stringLiteral('No current context set.')],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [
          t.templateLiteral(
            [
              t.templateElement({ raw: 'Current context: ', cooked: 'Current context: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [
              t.memberExpression(
                t.identifier('current'),
                t.identifier('name'),
              ),
            ],
          ),
        ],
      ),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [
          t.templateLiteral(
            [
              t.templateElement({ raw: '  Endpoint: ', cooked: '  Endpoint: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [
              t.memberExpression(
                t.identifier('current'),
                t.identifier('endpoint'),
              ),
            ],
          ),
        ],
      ),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('hasAuth'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('hasValidCredentials'),
          ),
          [
            t.memberExpression(
              t.identifier('current'),
              t.identifier('name'),
            ),
          ],
        ),
      ),
    ]),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [
          t.templateLiteral(
            [
              t.templateElement({ raw: '  Auth: ', cooked: '  Auth: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [
              t.conditionalExpression(
                t.identifier('hasAuth'),
                t.stringLiteral('authenticated'),
                t.stringLiteral('not authenticated'),
              ),
            ],
          ),
        ],
      ),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleCurrent'),
    [storeParam],
    t.blockStatement(body),
  );
  return func;
}

function buildDeleteHandler(): t.FunctionDeclaration {
  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('name')),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('contexts'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('listContexts'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.memberExpression(
          t.identifier('contexts'),
          t.identifier('length'),
        ),
        t.numericLiteral(0),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [t.stringLiteral('No contexts configured.')],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    t.variableDeclaration('let', [
      t.variableDeclarator(
        t.identifier('contextName'),
        t.identifier('name'),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('contextName')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('autocomplete'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('name'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('Select context to delete'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.callExpression(
                          t.memberExpression(
                            t.identifier('contexts'),
                            t.identifier('map'),
                          ),
                          [
                            t.arrowFunctionExpression(
                              [t.identifier('c')],
                              t.memberExpression(
                                t.identifier('c'),
                                t.identifier('name'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.identifier('contextName'),
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('name'),
            ),
          ),
        ),
      ]),
    ),
    t.ifStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('deleteContext'),
        ),
        [t.identifier('contextName')],
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: 'Deleted context: ', cooked: 'Deleted context: ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [t.identifier('contextName')],
              ),
            ],
          ),
        ),
      ]),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('error'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: 'Context "', cooked: 'Context "' }),
                  t.templateElement({ raw: '" not found.', cooked: '" not found.' }, true),
                ],
                [t.identifier('contextName')],
              ),
            ],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(1)],
          ),
        ),
      ]),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleDelete'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
  return func;
}

export function generateAuthCommand(toolName: string): GeneratedFile {
  const statements: t.Statement[] = [];

  statements.push(
    createImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );
  statements.push(
    createImportDeclaration('../executor', ['getStore']),
  );

  const usageStr = `
${toolName} auth <command>

Commands:
  set-token <token>     Set API token for the current context
  status                Show authentication status
  logout                Remove credentials for the current context

Options:
  --context <name>      Specify context (defaults to current context)

  --help, -h            Show this help message
`;

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('usage'), t.stringLiteral(usageStr)),
    ]),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const optionsParam = t.identifier('_options');
  optionsParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CLIOptions')),
  );

  const mainBody: t.Statement[] = [
    t.ifStatement(
      t.logicalExpression(
        '||',
        t.memberExpression(t.identifier('argv'), t.identifier('help')),
        t.memberExpression(t.identifier('argv'), t.identifier('h')),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [t.identifier('usage')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('store'),
        t.callExpression(t.identifier('getStore'), []),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier('first'),
            t.identifier('subcommand'),
          ),
          t.objectProperty(
            t.identifier('newArgv'),
            t.identifier('newArgv'),
            false,
            true,
          ),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('subcommand')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('autocomplete'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('subcommand'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('What do you want to do?'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.arrayExpression([
                          t.stringLiteral('set-token'),
                          t.stringLiteral('status'),
                          t.stringLiteral('logout'),
                        ]),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.returnStatement(
          t.callExpression(t.identifier('handleAuthSubcommand'), [
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('subcommand'),
            ),
            t.identifier('newArgv'),
            t.identifier('prompter'),
            t.identifier('store'),
          ]),
        ),
      ]),
    ),
    t.returnStatement(
      t.callExpression(t.identifier('handleAuthSubcommand'), [
        t.identifier('subcommand'),
        t.identifier('newArgv'),
        t.identifier('prompter'),
        t.identifier('store'),
      ]),
    ),
  ];

  statements.push(
    t.exportDefaultDeclaration(
      t.arrowFunctionExpression(
        [argvParam, prompterParam, optionsParam],
        t.blockStatement(mainBody),
        true,
      ),
    ),
  );

  const subcmdParam = t.identifier('subcommand');
  subcmdParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const argvParam2 = t.identifier('argv');
  argvParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam2 = t.identifier('prompter');
  prompterParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const handleAuthSubcommandFunc = t.functionDeclaration(
    t.identifier('handleAuthSubcommand'),
    [subcmdParam, argvParam2, prompterParam2, storeParam],
    t.blockStatement([
      t.switchStatement(t.identifier('subcommand'), [
        buildSwitchCase('set-token', 'handleSetToken', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('status', 'handleStatus', [t.identifier('store')]),
        buildSwitchCase('logout', 'handleLogout', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildDefaultSwitchCase('usage'),
      ]),
    ]),
    false,
    true,
  );
  statements.push(handleAuthSubcommandFunc);

  statements.push(buildSetTokenHandler());
  statements.push(buildStatusHandler());
  statements.push(buildLogoutHandler());

  const header = getGeneratedFileHeader('Authentication commands');
  const code = generateCode(statements);

  return {
    fileName: 'commands/auth.ts',
    content: header + '\n' + code,
  };
}

function buildSetTokenHandler(): t.FunctionDeclaration {
  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('current'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('getCurrentContext'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('current')),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('error'),
            ),
            [t.stringLiteral('No active context. Run "context create" first.')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(1)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('token')),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.variableDeclaration('let', [
      t.variableDeclarator(
        t.identifier('tokenValue'),
        t.identifier('token'),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('tokenValue')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('password'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('token'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('API Token'),
                      ),
                      t.objectProperty(
                        t.identifier('required'),
                        t.booleanLiteral(true),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.identifier('tokenValue'),
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('token'),
            ),
          ),
        ),
      ]),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('setCredentials'),
        ),
        [
          t.memberExpression(
            t.identifier('current'),
            t.identifier('name'),
          ),
          t.objectExpression([
            t.objectProperty(
              t.identifier('token'),
              t.callExpression(
                t.memberExpression(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('String'),
                      t.identifier('call'),
                    ),
                    [
                      t.logicalExpression(
                        '||',
                        t.identifier('tokenValue'),
                        t.stringLiteral(''),
                      ),
                    ],
                  ),
                  t.identifier('trim'),
                ),
                [],
              ),
            ),
          ]),
        ],
      ),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [
          t.templateLiteral(
            [
              t.templateElement({ raw: 'Token saved for context: ', cooked: 'Token saved for context: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [
              t.memberExpression(
                t.identifier('current'),
                t.identifier('name'),
              ),
            ],
          ),
        ],
      ),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleSetToken'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
  return func;
}

function buildStatusHandler(): t.FunctionDeclaration {
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('contexts'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('listContexts'),
          ),
          [],
        ),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('settings'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('loadSettings'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.memberExpression(
          t.identifier('contexts'),
          t.identifier('length'),
        ),
        t.numericLiteral(0),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [t.stringLiteral('No contexts configured.')],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [t.stringLiteral('Authentication Status:')],
      ),
    ),
    t.forOfStatement(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('ctx')),
      ]),
      t.identifier('contexts'),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('isCurrent'),
            t.binaryExpression(
              '===',
              t.memberExpression(
                t.identifier('ctx'),
                t.identifier('name'),
              ),
              t.memberExpression(
                t.identifier('settings'),
                t.identifier('currentContext'),
              ),
            ),
          ),
        ]),
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('hasAuth'),
            t.callExpression(
              t.memberExpression(
                t.identifier('store'),
                t.identifier('hasValidCredentials'),
              ),
              [
                t.memberExpression(
                  t.identifier('ctx'),
                  t.identifier('name'),
                ),
              ],
            ),
          ),
        ]),
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('marker'),
            t.conditionalExpression(
              t.identifier('isCurrent'),
              t.stringLiteral('* '),
              t.stringLiteral('  '),
            ),
          ),
        ]),
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('status'),
            t.conditionalExpression(
              t.identifier('hasAuth'),
              t.stringLiteral('authenticated'),
              t.stringLiteral('no token'),
            ),
          ),
        ]),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: '', cooked: '' }),
                  t.templateElement({ raw: '', cooked: '' }),
                  t.templateElement({ raw: ' [', cooked: ' [' }),
                  t.templateElement({ raw: ']', cooked: ']' }, true),
                ],
                [
                  t.identifier('marker'),
                  t.memberExpression(
                    t.identifier('ctx'),
                    t.identifier('name'),
                  ),
                  t.identifier('status'),
                ],
              ),
            ],
          ),
        ),
      ]),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleStatus'),
    [storeParam],
    t.blockStatement(body),
  );
  return func;
}

function buildLogoutHandler(): t.FunctionDeclaration {
  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('current'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('getCurrentContext'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('current')),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [t.stringLiteral('No active context.')],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('confirm'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('prompter'),
              t.identifier('prompt'),
            ),
            [
              t.identifier('argv'),
              t.arrayExpression([
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('type'),
                    t.stringLiteral('confirm'),
                  ),
                  t.objectProperty(
                    t.identifier('name'),
                    t.stringLiteral('confirm'),
                  ),
                  t.objectProperty(
                    t.identifier('message'),
                    t.templateLiteral(
                      [
                        t.templateElement({
                          raw: 'Remove credentials for "',
                          cooked: 'Remove credentials for "',
                        }),
                        t.templateElement({
                          raw: '"?',
                          cooked: '"?',
                        }, true),
                      ],
                      [
                        t.memberExpression(
                          t.identifier('current'),
                          t.identifier('name'),
                        ),
                      ],
                    ),
                  ),
                  t.objectProperty(
                    t.identifier('default'),
                    t.booleanLiteral(false),
                  ),
                ]),
              ]),
            ],
          ),
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression(
        '!',
        t.memberExpression(
          t.identifier('confirm'),
          t.identifier('confirm'),
        ),
      ),
      t.blockStatement([t.returnStatement()]),
    ),
    t.ifStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('removeCredentials'),
        ),
        [
          t.memberExpression(
            t.identifier('current'),
            t.identifier('name'),
          ),
        ],
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: 'Credentials removed for: ', cooked: 'Credentials removed for: ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [
                  t.memberExpression(
                    t.identifier('current'),
                    t.identifier('name'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ]),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({ raw: 'No credentials found for: ', cooked: 'No credentials found for: ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [
                  t.memberExpression(
                    t.identifier('current'),
                    t.identifier('name'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ]),
    ),
  ];

  const func = t.functionDeclaration(
    t.identifier('handleLogout'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
  return func;
}

export interface MultiTargetContextInput {
  name: string;
  endpoint: string;
}

export function generateMultiTargetContextCommand(
  toolName: string,
  commandName: string,
  targets: MultiTargetContextInput[],
): GeneratedFile {
  const statements: t.Statement[] = [];

  statements.push(
    createImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );
  statements.push(
    createImportDeclaration('../executor', ['getStore']),
  );

  const usageStr = `
${toolName} ${commandName} <command>

Commands:
  create <name>         Create a new context
  list                  List all contexts
  use <name>            Set the active context
  current               Show current context
  delete <name>         Delete a context

Create Options:
${targets.map((tgt) => `  --${tgt.name}-endpoint <url>  ${tgt.name} endpoint (default: ${tgt.endpoint})`).join('\n')}

  --help, -h            Show this help message
`;

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('usage'), t.stringLiteral(usageStr)),
    ]),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );

  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  const optionsParam = t.identifier('_options');
  optionsParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CLIOptions')),
  );

  const mainBody: t.Statement[] = [
    t.ifStatement(
      t.logicalExpression(
        '||',
        t.memberExpression(t.identifier('argv'), t.identifier('help')),
        t.memberExpression(t.identifier('argv'), t.identifier('h')),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [t.identifier('usage')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('store'),
        t.callExpression(t.identifier('getStore'), []),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier('first'),
            t.identifier('subcommand'),
          ),
          t.objectProperty(
            t.identifier('newArgv'),
            t.identifier('newArgv'),
            false,
            true,
          ),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('subcommand')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('autocomplete'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('subcommand'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('What do you want to do?'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.arrayExpression([
                          t.stringLiteral('create'),
                          t.stringLiteral('list'),
                          t.stringLiteral('use'),
                          t.stringLiteral('current'),
                          t.stringLiteral('delete'),
                        ]),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.returnStatement(
          t.callExpression(t.identifier('handleSubcommand'), [
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('subcommand'),
            ),
            t.identifier('newArgv'),
            t.identifier('prompter'),
            t.identifier('store'),
          ]),
        ),
      ]),
    ),
    t.returnStatement(
      t.callExpression(t.identifier('handleSubcommand'), [
        t.identifier('subcommand'),
        t.identifier('newArgv'),
        t.identifier('prompter'),
        t.identifier('store'),
      ]),
    ),
  ];

  const mainExport = t.exportDefaultDeclaration(
    t.arrowFunctionExpression(
      [argvParam, prompterParam, optionsParam],
      t.blockStatement(mainBody),
      true,
    ),
  );
  statements.push(mainExport);

  const subcmdParam = t.identifier('subcommand');
  subcmdParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const argvParam2 = t.identifier('argv');
  argvParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam2 = t.identifier('prompter');
  prompterParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const handleSubcommandFunc = t.functionDeclaration(
    t.identifier('handleSubcommand'),
    [subcmdParam, argvParam2, prompterParam2, storeParam],
    t.blockStatement([
      t.switchStatement(t.identifier('subcommand'), [
        buildSwitchCase('create', 'handleCreate', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('list', 'handleList', [t.identifier('store')]),
        buildSwitchCase('use', 'handleUse', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('current', 'handleCurrent', [t.identifier('store')]),
        buildSwitchCase('delete', 'handleDelete', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildDefaultSwitchCase('usage'),
      ]),
    ]),
    false,
    true,
  );
  statements.push(handleSubcommandFunc);

  statements.push(buildMultiTargetCreateHandler(targets));
  statements.push(buildListHandler());
  statements.push(buildUseHandler());
  statements.push(buildCurrentHandler());
  statements.push(buildDeleteHandler());

  const header = getGeneratedFileHeader('Multi-target context management commands');
  const code = generateCode(statements);

  return {
    fileName: `commands/${commandName}.ts`,
    content: header + '\n' + code,
  };
}

function buildMultiTargetCreateHandler(
  targets: MultiTargetContextInput[],
): t.FunctionDeclaration {
  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const promptQuestions: t.Expression[] = [
    t.objectExpression([
      t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
      t.objectProperty(t.identifier('name'), t.stringLiteral('name')),
      t.objectProperty(t.identifier('message'), t.stringLiteral('Context name')),
      t.objectProperty(t.identifier('required'), t.booleanLiteral(true)),
    ]),
  ];

  for (const target of targets) {
    const fieldName = `${target.name}Endpoint`;
    promptQuestions.push(
      t.objectExpression([
        t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
        t.objectProperty(t.identifier('name'), t.stringLiteral(fieldName)),
        t.objectProperty(
          t.identifier('message'),
          t.stringLiteral(`${target.name} endpoint`),
        ),
        t.objectProperty(
          t.identifier('default'),
          t.stringLiteral(target.endpoint),
        ),
      ]),
    );
  }

  const targetsObjProps = targets.map((target) => {
    const fieldName = `${target.name}Endpoint`;
    return t.objectProperty(
      t.stringLiteral(target.name),
      t.objectExpression([
        t.objectProperty(
          t.identifier('endpoint'),
          t.memberExpression(t.identifier('answers'), t.identifier(fieldName)),
        ),
      ]),
    );
  });

  const body: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('name')),
          t.objectProperty(
            t.identifier('newArgv'),
            t.identifier('restArgv'),
          ),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('answers'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('prompter'),
              t.identifier('prompt'),
            ),
            [
              t.objectExpression([
                t.objectProperty(
                  t.identifier('name'),
                  t.identifier('name'),
                  false,
                  true,
                ),
                t.spreadElement(t.identifier('restArgv')),
              ]),
              t.arrayExpression(promptQuestions),
            ],
          ),
        ),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('contextName'),
        t.memberExpression(t.identifier('answers'), t.identifier('name')),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('targets'),
        t.objectExpression(targetsObjProps),
      ),
    ]),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('store'), t.identifier('createContext')),
        [
          t.identifier('contextName'),
          t.objectExpression([
            t.objectProperty(
              t.identifier('endpoint'),
              t.memberExpression(
                t.identifier('answers'),
                t.identifier(`${targets[0].name}Endpoint`),
              ),
            ),
            t.objectProperty(
              t.identifier('targets'),
              t.identifier('targets'),
            ),
          ]),
        ],
      ),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('settings'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('loadSettings'),
          ),
          [],
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression(
        '!',
        t.memberExpression(
          t.identifier('settings'),
          t.identifier('currentContext'),
        ),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('store'),
              t.identifier('setCurrentContext'),
            ),
            [t.identifier('contextName')],
          ),
        ),
      ]),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log')),
        [
          t.templateLiteral(
            [
              t.templateElement({ raw: 'Created context: ', cooked: 'Created context: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [t.identifier('contextName')],
          ),
        ],
      ),
    ),
  ];

  for (const target of targets) {
    const fieldName = `${target.name}Endpoint`;
    body.push(
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('console'), t.identifier('log')),
          [
            t.templateLiteral(
              [
                t.templateElement({ raw: `  ${target.name}: `, cooked: `  ${target.name}: ` }),
                t.templateElement({ raw: '', cooked: '' }, true),
              ],
              [t.memberExpression(t.identifier('answers'), t.identifier(fieldName))],
            ),
          ],
        ),
      ),
    );
  }

  const func = t.functionDeclaration(
    t.identifier('handleCreate'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
  return func;
}

export function generateAuthCommandWithName(
  toolName: string,
  commandName: string,
): GeneratedFile {
  const statements: t.Statement[] = [];

  statements.push(
    createImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );
  statements.push(
    createImportDeclaration('../executor', ['getStore']),
  );

  const usageStr = `
${toolName} ${commandName} <command>

Commands:
  set-token <token>     Set API token for the current context
  status                Show authentication status
  logout                Remove credentials for the current context

Options:
  --context <name>      Specify context (defaults to current context)

  --help, -h            Show this help message
`;

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('usage'), t.stringLiteral(usageStr)),
    ]),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const optionsParam = t.identifier('_options');
  optionsParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CLIOptions')),
  );

  const mainBody: t.Statement[] = [
    t.ifStatement(
      t.logicalExpression(
        '||',
        t.memberExpression(t.identifier('argv'), t.identifier('help')),
        t.memberExpression(t.identifier('argv'), t.identifier('h')),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [t.identifier('usage')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('store'),
        t.callExpression(t.identifier('getStore'), []),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier('first'),
            t.identifier('subcommand'),
          ),
          t.objectProperty(
            t.identifier('newArgv'),
            t.identifier('newArgv'),
            false,
            true,
          ),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('subcommand')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('autocomplete'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('subcommand'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('What do you want to do?'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.arrayExpression([
                          t.stringLiteral('set-token'),
                          t.stringLiteral('status'),
                          t.stringLiteral('logout'),
                        ]),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.returnStatement(
          t.callExpression(t.identifier('handleAuthSubcommand'), [
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('subcommand'),
            ),
            t.identifier('newArgv'),
            t.identifier('prompter'),
            t.identifier('store'),
          ]),
        ),
      ]),
    ),
    t.returnStatement(
      t.callExpression(t.identifier('handleAuthSubcommand'), [
        t.identifier('subcommand'),
        t.identifier('newArgv'),
        t.identifier('prompter'),
        t.identifier('store'),
      ]),
    ),
  ];

  statements.push(
    t.exportDefaultDeclaration(
      t.arrowFunctionExpression(
        [argvParam, prompterParam, optionsParam],
        t.blockStatement(mainBody),
        true,
      ),
    ),
  );

  const subcmdParam = t.identifier('subcommand');
  subcmdParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const argvParam2 = t.identifier('argv');
  argvParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
  const prompterParam2 = t.identifier('prompter');
  prompterParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const storeParam = t.identifier('store');
  storeParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('ReturnType'),
      t.tsTypeParameterInstantiation([
        t.tsTypeQuery(t.identifier('getStore')),
      ]),
    ),
  );

  const handleAuthSubcommandFunc = t.functionDeclaration(
    t.identifier('handleAuthSubcommand'),
    [subcmdParam, argvParam2, prompterParam2, storeParam],
    t.blockStatement([
      t.switchStatement(t.identifier('subcommand'), [
        buildSwitchCase('set-token', 'handleSetToken', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('status', 'handleStatus', [t.identifier('store')]),
        buildSwitchCase('logout', 'handleLogout', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildDefaultSwitchCase('usage'),
      ]),
    ]),
    false,
    true,
  );
  statements.push(handleAuthSubcommandFunc);

  statements.push(buildSetTokenHandler());
  statements.push(buildStatusHandler());
  statements.push(buildLogoutHandler());

  const header = getGeneratedFileHeader('Authentication commands');
  const code = generateCode(statements);

  return {
    fileName: `commands/${commandName}.ts`,
    content: header + '\n' + code,
  };
}
