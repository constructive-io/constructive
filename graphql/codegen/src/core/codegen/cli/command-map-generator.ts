import * as t from '@babel/types';
import { toKebabCase } from 'komoji';

import { generateCode } from '../babel-ast';
import { getGeneratedFileHeader, getTableNames } from '../utils';
import type { CleanTable, CleanOperation } from '../../../types/schema';
import type { GeneratedFile } from './executor-generator';

function createImportDeclaration(
  moduleSpecifier: string,
  defaultImportName: string,
): t.ImportDeclaration {
  return t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier(defaultImportName))],
    t.stringLiteral(moduleSpecifier),
  );
}

function createNamedImportDeclaration(
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

export function generateCommandMap(
  tables: CleanTable[],
  customOperations: CleanOperation[],
  toolName: string,
): GeneratedFile {
  const statements: t.Statement[] = [];

  statements.push(
    createNamedImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );

  const commandEntries: { kebab: string; importName: string }[] = [];

  commandEntries.push({ kebab: 'context', importName: 'contextCmd' });
  statements.push(
    createImportDeclaration('./commands/context', 'contextCmd'),
  );

  commandEntries.push({ kebab: 'auth', importName: 'authCmd' });
  statements.push(createImportDeclaration('./commands/auth', 'authCmd'));

  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    const importName = `${singularName}Cmd`;
    commandEntries.push({ kebab, importName });
    statements.push(
      createImportDeclaration(`./commands/${kebab}`, importName),
    );
  }

  for (const op of customOperations) {
    const kebab = toKebabCase(op.name);
    const importName = `${op.name}Cmd`;
    commandEntries.push({ kebab, importName });
    statements.push(
      createImportDeclaration(`./commands/${kebab}`, importName),
    );
  }

  const mapProperties = commandEntries.map((entry) =>
    t.objectProperty(
      t.stringLiteral(entry.kebab),
      t.identifier(entry.importName),
    ),
  );

  const createCommandMapFunc = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('createCommandMap'),
      t.arrowFunctionExpression(
        [],
        t.objectExpression(mapProperties),
      ),
    ),
  ]);

  const createCommandMapAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Record'),
      t.tsTypeParameterInstantiation([
        t.tsStringKeyword(),
        t.tsFunctionType(null, [], t.tsTypeAnnotation(t.tsAnyKeyword())),
      ]),
    ),
  );

  const createCommandMapId = t.identifier('createCommandMap');
  createCommandMapId.typeAnnotation = t.tsTypeAnnotation(
    t.tsParenthesizedType(
      t.tsFunctionType(
        null,
        [],
        t.tsTypeAnnotation(
          t.tsTypeReference(
            t.identifier('Record'),
            t.tsTypeParameterInstantiation([
              t.tsStringKeyword(),
              t.tsFunctionType(null, [], t.tsTypeAnnotation(t.tsUnknownKeyword())),
            ]),
          ),
        ),
      ),
    ),
  );

  statements.push(createCommandMapFunc);

  const usageLines = [
    '',
    `${toolName} <command>`,
    '',
    'Commands:',
    '  context               Manage API contexts',
    '  auth                  Manage authentication',
  ];

  for (const table of tables) {
    const { singularName } = getTableNames(table);
    const kebab = toKebabCase(singularName);
    usageLines.push(
      `  ${kebab.padEnd(20)} ${singularName} CRUD operations`,
    );
  }

  for (const op of customOperations) {
    const kebab = toKebabCase(op.name);
    usageLines.push(
      `  ${kebab.padEnd(20)} ${op.description || op.name}`,
    );
  }

  usageLines.push('');
  usageLines.push('  --help, -h            Show this help message');
  usageLines.push('  --version, -v         Show version');
  usageLines.push('');

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('usage'),
        t.stringLiteral(usageLines.join('\n')),
      ),
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
  const optionsParam = t.identifier('options');
  optionsParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CLIOptions')),
  );

  const commandsBody: t.Statement[] = [
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
            t.memberExpression(
              t.identifier('process'),
              t.identifier('exit'),
            ),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('let', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier('first'),
            t.identifier('command'),
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
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('commandMap'),
        t.callExpression(t.identifier('createCommandMap'), []),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('command')),
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
                        t.stringLiteral('command'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('What do you want to do?'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.callExpression(
                          t.memberExpression(
                            t.identifier('Object'),
                            t.identifier('keys'),
                          ),
                          [t.identifier('commandMap')],
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
            t.identifier('command'),
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('command'),
            ),
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('commandFn'),
        t.memberExpression(
          t.identifier('commandMap'),
          t.identifier('command'),
          true,
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('commandFn')),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [t.identifier('usage')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('error'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({
                    raw: 'Unknown command: ',
                    cooked: 'Unknown command: ',
                  }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [t.identifier('command')],
              ),
            ],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('process'),
              t.identifier('exit'),
            ),
            [t.numericLiteral(1)],
          ),
        ),
      ]),
    ),
    t.expressionStatement(
      t.awaitExpression(
        t.callExpression(t.identifier('commandFn'), [
          t.identifier('newArgv'),
          t.identifier('prompter'),
          t.identifier('options'),
        ]),
      ),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('prompter'), t.identifier('close')),
        [],
      ),
    ),
    t.returnStatement(t.identifier('argv')),
  ];

  const commandsFunc = t.arrowFunctionExpression(
    [argvParam, prompterParam, optionsParam],
    t.blockStatement(commandsBody),
    true,
  );

  const commandsDecl = t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier('commands'), commandsFunc),
  ]);
  statements.push(t.exportNamedDeclaration(commandsDecl));

  const header = getGeneratedFileHeader('CLI command map and entry point');
  const code = generateCode(statements);

  return {
    fileName: 'commands.ts',
    content: header + '\n' + code,
  };
}

export interface MultiTargetCommandMapInput {
  toolName: string;
  infraNames: { auth: string; context: string };
  targets: Array<{
    name: string;
    tables: CleanTable[];
    customOperations: CleanOperation[];
  }>;
}

export function generateMultiTargetCommandMap(
  input: MultiTargetCommandMapInput,
): GeneratedFile {
  const { toolName, infraNames, targets } = input;
  const statements: t.Statement[] = [];

  statements.push(
    createNamedImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );

  const commandEntries: { kebab: string; importName: string }[] = [];

  const contextImportName = `${infraNames.context}Cmd`;
  commandEntries.push({ kebab: infraNames.context, importName: contextImportName });
  statements.push(
    createImportDeclaration(`./commands/${infraNames.context}`, contextImportName),
  );

  const authImportName = `${infraNames.auth}Cmd`;
  commandEntries.push({ kebab: infraNames.auth, importName: authImportName });
  statements.push(
    createImportDeclaration(`./commands/${infraNames.auth}`, authImportName),
  );

  for (const target of targets) {
    for (const table of target.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const prefixedKebab = `${target.name}:${kebab}`;
      const importName = `${target.name}${singularName[0].toUpperCase()}${singularName.slice(1)}Cmd`;
      commandEntries.push({ kebab: prefixedKebab, importName });
      statements.push(
        createImportDeclaration(`./commands/${target.name}/${kebab}`, importName),
      );
    }

    for (const op of target.customOperations) {
      const kebab = toKebabCase(op.name);
      const prefixedKebab = `${target.name}:${kebab}`;
      const importName = `${target.name}${op.name[0].toUpperCase()}${op.name.slice(1)}Cmd`;
      commandEntries.push({ kebab: prefixedKebab, importName });
      statements.push(
        createImportDeclaration(`./commands/${target.name}/${kebab}`, importName),
      );
    }
  }

  const mapProperties = commandEntries.map((entry) =>
    t.objectProperty(
      t.stringLiteral(entry.kebab),
      t.identifier(entry.importName),
    ),
  );

  const createCommandMapFunc = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('createCommandMap'),
      t.arrowFunctionExpression(
        [],
        t.objectExpression(mapProperties),
      ),
    ),
  ]);
  statements.push(createCommandMapFunc);

  const usageLines = [
    '',
    `${toolName} <command>`,
    '',
    'Commands:',
    `  ${infraNames.context.padEnd(20)} Manage API contexts`,
    `  ${infraNames.auth.padEnd(20)} Manage authentication`,
  ];

  for (const target of targets) {
    usageLines.push('');
    usageLines.push(`  ${target.name}:`);
    for (const table of target.tables) {
      const { singularName } = getTableNames(table);
      const kebab = toKebabCase(singularName);
      const cmd = `${target.name}:${kebab}`;
      usageLines.push(
        `    ${cmd.padEnd(22)} ${singularName} CRUD operations`,
      );
    }
    for (const op of target.customOperations) {
      const kebab = toKebabCase(op.name);
      const cmd = `${target.name}:${kebab}`;
      usageLines.push(
        `    ${cmd.padEnd(22)} ${op.description || op.name}`,
      );
    }
  }

  usageLines.push('');
  usageLines.push('  --help, -h            Show this help message');
  usageLines.push('  --version, -v         Show version');
  usageLines.push('');

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('usage'),
        t.stringLiteral(usageLines.join('\n')),
      ),
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
  const optionsParam = t.identifier('options');
  optionsParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CLIOptions')),
  );

  const commandsBody: t.Statement[] = [
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
            t.memberExpression(
              t.identifier('process'),
              t.identifier('exit'),
            ),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('let', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier('first'),
            t.identifier('command'),
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
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('commandMap'),
        t.callExpression(t.identifier('createCommandMap'), []),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('command')),
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
                        t.stringLiteral('command'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('What do you want to do?'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.callExpression(
                          t.memberExpression(
                            t.identifier('Object'),
                            t.identifier('keys'),
                          ),
                          [t.identifier('commandMap')],
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
            t.identifier('command'),
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('command'),
            ),
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('commandFn'),
        t.memberExpression(
          t.identifier('commandMap'),
          t.identifier('command'),
          true,
        ),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('commandFn')),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [t.identifier('usage')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('console'),
              t.identifier('error'),
            ),
            [
              t.templateLiteral(
                [
                  t.templateElement({
                    raw: 'Unknown command: ',
                    cooked: 'Unknown command: ',
                  }),
                  t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [t.identifier('command')],
              ),
            ],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('process'),
              t.identifier('exit'),
            ),
            [t.numericLiteral(1)],
          ),
        ),
      ]),
    ),
    t.expressionStatement(
      t.awaitExpression(
        t.callExpression(t.identifier('commandFn'), [
          t.identifier('newArgv'),
          t.identifier('prompter'),
          t.identifier('options'),
        ]),
      ),
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('prompter'), t.identifier('close')),
        [],
      ),
    ),
    t.returnStatement(t.identifier('argv')),
  ];

  const commandsFunc = t.arrowFunctionExpression(
    [argvParam, prompterParam, optionsParam],
    t.blockStatement(commandsBody),
    true,
  );

  const commandsDecl = t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier('commands'), commandsFunc),
  ]);
  statements.push(t.exportNamedDeclaration(commandsDecl));

  const header = getGeneratedFileHeader('Multi-target CLI command map and entry point');
  const code = generateCode(statements);

  return {
    fileName: 'commands.ts',
    content: header + '\n' + code,
  };
}
