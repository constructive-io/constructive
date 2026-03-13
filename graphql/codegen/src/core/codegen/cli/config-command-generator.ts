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

/**
 * Generate the config command file (get/set/list/delete for per-context vars).
 *
 * Usage:
 *   <tool> config get <key>
 *   <tool> config set <key> <value>
 *   <tool> config list
 *   <tool> config delete <key>
 */
export function generateConfigCommand(
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
  get <key>             Get a config value
  set <key> <value>     Set a config value
  list                  List all config values
  delete <key>          Delete a config value

  --help, -h            Show this help message
`;

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('usage'), t.stringLiteral(usageStr)),
    ]),
  );

  // Main export: default async (argv, prompter, _options) => { ... }
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
    // Help check
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
    // const store = getStore();
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('store'),
        t.callExpression(t.identifier('getStore'), []),
      ),
    ]),
    // const { first: subcommand, newArgv } = extractFirst(argv);
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
    // If no subcommand, prompt
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
                          t.stringLiteral('get'),
                          t.stringLiteral('set'),
                          t.stringLiteral('list'),
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

  // handleSubcommand function
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
        buildSwitchCase('get', 'handleGet', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('set', 'handleSet', [
          t.identifier('argv'),
          t.identifier('prompter'),
          t.identifier('store'),
        ]),
        buildSwitchCase('list', 'handleList', [t.identifier('store')]),
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

  // handleGet
  statements.push(buildGetHandler());
  // handleSet
  statements.push(buildSetHandler());
  // handleList
  statements.push(buildListHandler());
  // handleDelete
  statements.push(buildDeleteHandler());

  const header = getGeneratedFileHeader('Config key-value store commands');
  const code = generateCode(statements);

  return {
    fileName: `commands/${commandName}.ts`,
    content: header + '\n' + code,
  };
}

function buildGetHandler(): t.FunctionDeclaration {
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
    // const { first: key } = extractFirst(argv);
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('key')),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    // Prompt if no key
    t.ifStatement(
      t.unaryExpression('!', t.identifier('key')),
      t.blockStatement([
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
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('text'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('key'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('Config key'),
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
            t.identifier('value'),
            t.callExpression(
              t.memberExpression(
                t.identifier('store'),
                t.identifier('getVar'),
              ),
              [t.memberExpression(t.identifier('answers'), t.identifier('key'))],
            ),
          ),
        ]),
        t.ifStatement(
          t.binaryExpression(
            '===',
            t.identifier('value'),
            t.identifier('undefined'),
          ),
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
                      t.templateElement({ raw: 'Key "', cooked: 'Key "' }),
                      t.templateElement({ raw: '" not found.', cooked: '" not found.' }, true),
                    ],
                    [t.memberExpression(t.identifier('answers'), t.identifier('key'))],
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
                [t.identifier('value')],
              ),
            ),
          ]),
        ),
        t.returnStatement(),
      ]),
    ),
    // const value = store.getVar(key);
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('value'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('getVar'),
          ),
          [t.identifier('key')],
        ),
      ),
    ]),
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.identifier('value'),
        t.identifier('undefined'),
      ),
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
                  t.templateElement({ raw: 'Key "', cooked: 'Key "' }),
                  t.templateElement({ raw: '" not found.', cooked: '" not found.' }, true),
                ],
                [t.identifier('key')],
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
            [t.identifier('value')],
          ),
        ),
      ]),
    ),
  ];

  return t.functionDeclaration(
    t.identifier('handleGet'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
}

function buildSetHandler(): t.FunctionDeclaration {
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
    // const { first: key, newArgv: restArgv } = extractFirst(argv);
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('key')),
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
    // const { first: value } = extractFirst(restArgv);
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('value')),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('restArgv'),
        ]),
      ),
    ]),
    // Prompt if missing key or value
    t.ifStatement(
      t.logicalExpression(
        '||',
        t.unaryExpression('!', t.identifier('key')),
        t.unaryExpression('!', t.identifier('value')),
      ),
      t.blockStatement([
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
                      t.identifier('key'),
                      t.identifier('key'),
                      false,
                      true,
                    ),
                    t.objectProperty(
                      t.identifier('value'),
                      t.identifier('value'),
                      false,
                      true,
                    ),
                  ]),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('text'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('key'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('Config key'),
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
                        t.stringLiteral('value'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('Config value'),
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
          t.callExpression(
            t.memberExpression(
              t.identifier('store'),
              t.identifier('setVar'),
            ),
            [
              t.memberExpression(t.identifier('answers'), t.identifier('key')),
              t.callExpression(
                t.memberExpression(t.identifier('String'), t.identifier('call')),
                [
                  t.identifier('undefined'),
                  t.memberExpression(t.identifier('answers'), t.identifier('value')),
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
                  t.templateElement({ raw: 'Set ', cooked: 'Set ' }),
                  t.templateElement({ raw: ' = ', cooked: ' = ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [
                  t.memberExpression(t.identifier('answers'), t.identifier('key')),
                  t.memberExpression(t.identifier('answers'), t.identifier('value')),
                ],
              ),
            ],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    // store.setVar(key, String(value));
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('setVar'),
        ),
        [
          t.identifier('key'),
          t.callExpression(t.identifier('String'), [t.identifier('value')]),
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
              t.templateElement({ raw: 'Set ', cooked: 'Set ' }),
              t.templateElement({ raw: ' = ', cooked: ' = ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [t.identifier('key'), t.identifier('value')],
          ),
        ],
      ),
    ),
  ];

  return t.functionDeclaration(
    t.identifier('handleSet'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
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
    // const vars = store.listVars();
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('vars'),
        t.callExpression(
          t.memberExpression(
            t.identifier('store'),
            t.identifier('listVars'),
          ),
          [],
        ),
      ),
    ]),
    // const entries = Object.entries(vars);
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('entries'),
        t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('entries')),
          [t.identifier('vars')],
        ),
      ),
    ]),
    t.ifStatement(
      t.binaryExpression(
        '===',
        t.memberExpression(t.identifier('entries'), t.identifier('length')),
        t.numericLiteral(0),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('log'),
            ),
            [t.stringLiteral('No config values set.')],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    // for (const [key, value] of entries) { console.log(`${key} = ${value}`); }
    t.forOfStatement(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.arrayPattern([t.identifier('key'), t.identifier('value')]),
        ),
      ]),
      t.identifier('entries'),
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
                  t.templateElement({ raw: '', cooked: '' }),
                  t.templateElement({ raw: ' = ', cooked: ' = ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [t.identifier('key'), t.identifier('value')],
              ),
            ],
          ),
        ),
      ]),
    ),
  ];

  return t.functionDeclaration(
    t.identifier('handleList'),
    [storeParam],
    t.blockStatement(body),
  );
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
    // const { first: key } = extractFirst(argv);
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('first'), t.identifier('key')),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    // Prompt if no key
    t.ifStatement(
      t.unaryExpression('!', t.identifier('key')),
      t.blockStatement([
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
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('text'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('key'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('Config key to delete'),
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
          t.callExpression(
            t.memberExpression(
              t.identifier('store'),
              t.identifier('deleteVar'),
            ),
            [t.memberExpression(t.identifier('answers'), t.identifier('key'))],
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
                  t.templateElement({ raw: 'Deleted key: ', cooked: 'Deleted key: ' }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [t.memberExpression(t.identifier('answers'), t.identifier('key'))],
              ),
            ],
          ),
        ),
        t.returnStatement(),
      ]),
    ),
    // store.deleteVar(key);
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('deleteVar'),
        ),
        [t.identifier('key')],
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
              t.templateElement({ raw: 'Deleted key: ', cooked: 'Deleted key: ' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [t.identifier('key')],
          ),
        ],
      ),
    ),
  ];

  return t.functionDeclaration(
    t.identifier('handleDelete'),
    [argvParam, prompterParam, storeParam],
    t.blockStatement(body),
    false,
    true,
  );
}
