import * as t from '@babel/types';
import { toKebabCase } from 'komoji';

import { generateCode } from '../babel-ast';
import {
  getGeneratedFileHeader,
  getPrimaryKeyInfo,
  getScalarFields,
  getTableNames,
  ucFirst,
} from '../utils';
import type { CleanTable, TypeRegistry } from '../../../types/schema';
import type { GeneratedFile } from './executor-generator';
import { getCreateInputTypeName } from '../utils';

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

/**
 * Build a field schema object that maps field names to their GraphQL types.
 * This is used at runtime for type coercion (string CLI args → proper types).
 * e.g., { name: 'string', isActive: 'boolean', position: 'int', status: 'enum' }
 */
function buildFieldSchemaObject(table: CleanTable): t.ObjectExpression {
  const fields = getScalarFields(table);
  return t.objectExpression(
    fields.map((f) => {
      const gqlType = f.type.gqlType.replace(/!/g, '');
      let schemaType: string;
      switch (gqlType) {
        case 'Boolean':
          schemaType = 'boolean';
          break;
        case 'Int':
        case 'BigInt':
          schemaType = 'int';
          break;
        case 'Float':
          schemaType = 'float';
          break;
        case 'JSON':
        case 'GeoJSON':
          schemaType = 'json';
          break;
        case 'UUID':
          schemaType = 'uuid';
          break;
        default:
          schemaType = 'string';
      }
      return t.objectProperty(
        t.identifier(f.name),
        t.stringLiteral(schemaType),
      );
    }),
  );
}

function buildSelectObject(table: CleanTable): t.ObjectExpression {
  const fields = getScalarFields(table);
  return t.objectExpression(
    fields.map((f) =>
      t.objectProperty(t.identifier(f.name), t.booleanLiteral(true)),
    ),
  );
}

function buildJsonLog(expr: t.Expression): t.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(
      t.memberExpression(t.identifier('console'), t.identifier('log')),
      [
        t.callExpression(
          t.memberExpression(t.identifier('JSON'), t.identifier('stringify')),
          [expr, t.nullLiteral(), t.numericLiteral(2)],
        ),
      ],
    ),
  );
}

function buildOrmCall(
  singularName: string,
  methodName: string,
  args: t.ObjectExpression,
): t.Expression {
  return t.callExpression(
    t.memberExpression(
      t.callExpression(
        t.memberExpression(
          t.memberExpression(
            t.identifier('client'),
            t.identifier(singularName),
          ),
          t.identifier(methodName),
        ),
        [args],
      ),
      t.identifier('execute'),
    ),
    [],
  );
}

function buildErrorCatch(errorMessage: string): t.CatchClause {
  return t.catchClause(
    t.identifier('error'),
    t.blockStatement([
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(
            t.identifier('console'),
            t.identifier('error'),
          ),
          [t.stringLiteral(errorMessage)],
        ),
      ),
      t.ifStatement(
        t.binaryExpression(
          'instanceof',
          t.identifier('error'),
          t.identifier('Error'),
        ),
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier('console'),
                t.identifier('error'),
              ),
              [
                t.memberExpression(
                  t.identifier('error'),
                  t.identifier('message'),
                ),
              ],
            ),
          ),
        ]),
      ),
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('process'), t.identifier('exit')),
          [t.numericLiteral(1)],
        ),
      ),
    ]),
  );
}

function buildGetClientStatement(targetName?: string): t.VariableDeclaration {
  const args: t.Expression[] = targetName
    ? [t.stringLiteral(targetName)]
    : [];
  return t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('client'),
      t.callExpression(t.identifier('getClient'), args),
    ),
  ]);
}

function buildArgvType(): t.TSTypeAnnotation {
  return t.tsTypeAnnotation(
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
}

function buildSubcommandSwitch(
  subcommands: string[],
  handlerPrefix: string,
  usageVarName: string,
): t.SwitchStatement {
  const cases = subcommands.map((sub) =>
    t.switchCase(t.stringLiteral(sub), [
      t.returnStatement(
        t.callExpression(t.identifier(`${handlerPrefix}${ucFirst(sub)}`), [
          t.identifier('argv'),
          t.identifier('prompter'),
        ]),
      ),
    ]),
  );
  cases.push(
    t.switchCase(null, [
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
    ]),
  );
  return t.switchStatement(t.identifier('subcommand'), cases);
}

function buildListHandler(table: CleanTable, targetName?: string): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const selectObj = buildSelectObject(table);

  const tryBody: t.Statement[] = [
    buildGetClientStatement(targetName),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          buildOrmCall(
            singularName,
            'findMany',
            t.objectExpression([
              t.objectProperty(t.identifier('select'), selectObj),
            ]),
          ),
        ),
      ),
    ]),
    buildJsonLog(t.identifier('result')),
  ];

  const argvParam = t.identifier('_argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('_prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  return t.functionDeclaration(
    t.identifier('handleList'),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch('Failed to list records.'),
      ),
    ]),
    false,
    true,
  );
}

function buildGetHandler(table: CleanTable, targetName?: string): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const pkFields = getPrimaryKeyInfo(table);
  const pk = pkFields[0];
  const selectObj = buildSelectObject(table);

  const promptQuestion = t.objectExpression([
    t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
    t.objectProperty(t.identifier('name'), t.stringLiteral(pk.name)),
    t.objectProperty(t.identifier('message'), t.stringLiteral(pk.name)),
    t.objectProperty(t.identifier('required'), t.booleanLiteral(true)),
  ]);

  const ormArgs = t.objectExpression([
    t.objectProperty(
      t.identifier(pk.name),
      t.memberExpression(t.identifier('answers'), t.identifier(pk.name)),
    ),
    t.objectProperty(t.identifier('select'), selectObj),
  ]);

  const tryBody: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('answers'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('prompter'),
              t.identifier('prompt'),
            ),
            [t.identifier('argv'), t.arrayExpression([promptQuestion])],
          ),
        ),
      ),
    ]),
    buildGetClientStatement(targetName),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(buildOrmCall(singularName, 'findOne', ormArgs)),
      ),
    ]),
    buildJsonLog(t.identifier('result')),
  ];

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  return t.functionDeclaration(
    t.identifier('handleGet'),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch('Record not found.'),
      ),
    ]),
    false,
    true,
  );
}

/**
 * Get the set of field names that have defaults in the create input type.
 * Looks up the CreateXInput -> inner input type (e.g. DatabaseInput) in the
 * TypeRegistry and checks each field's defaultValue from introspection.
 */
function getFieldsWithDefaults(
  table: CleanTable,
  typeRegistry?: TypeRegistry,
): Set<string> {
  const fieldsWithDefaults = new Set<string>();
  if (!typeRegistry) return fieldsWithDefaults;

  // Look up the CreateXInput type (e.g. CreateDatabaseInput)
  const createInputTypeName = getCreateInputTypeName(table);
  const createInputType = typeRegistry.get(createInputTypeName);
  if (!createInputType?.inputFields) return fieldsWithDefaults;

  // The CreateXInput has an inner field (e.g. "database" of type DatabaseInput)
  // Find the inner input type that contains the actual field definitions
  for (const inputField of createInputType.inputFields) {
    // The inner field's type name is the actual input type (e.g. DatabaseInput)
    const innerTypeName = inputField.type.name
      || inputField.type.ofType?.name
      || inputField.type.ofType?.ofType?.name;
    if (!innerTypeName) continue;

    const innerType = typeRegistry.get(innerTypeName);
    if (!innerType?.inputFields) continue;

    // Check each field in the inner input type for defaultValue
    for (const field of innerType.inputFields) {
      if (field.defaultValue !== undefined) {
        fieldsWithDefaults.add(field.name);
      }
      // Also check if the field is NOT wrapped in NON_NULL (nullable = has default or is optional)
      if (field.type.kind !== 'NON_NULL') {
        fieldsWithDefaults.add(field.name);
      }
    }
  }

  return fieldsWithDefaults;
}

function buildMutationHandler(
  table: CleanTable,
  operation: 'create' | 'update' | 'delete',
  targetName?: string,
  typeRegistry?: TypeRegistry,
): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const pkFields = getPrimaryKeyInfo(table);
  const pk = pkFields[0];

  const editableFields = getScalarFields(table).filter(
    (f) =>
      f.name !== pk.name &&
      f.name !== 'nodeId' &&
      f.name !== 'createdAt' &&
      f.name !== 'updatedAt',
  );

  // Get fields that have defaults from introspection (for create operations)
  const fieldsWithDefaults = getFieldsWithDefaults(table, typeRegistry);

  const questions: t.Expression[] = [];

  if (operation === 'update' || operation === 'delete') {
    questions.push(
      t.objectExpression([
        t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
        t.objectProperty(t.identifier('name'), t.stringLiteral(pk.name)),
        t.objectProperty(t.identifier('message'), t.stringLiteral(pk.name)),
        t.objectProperty(t.identifier('required'), t.booleanLiteral(true)),
      ]),
    );
  }

  if (operation !== 'delete') {
    for (const field of editableFields) {
      // For create: field is required only if it has no default value
      // For update: all fields are optional (user only updates what they want)
      const isRequired = operation === 'create' && !fieldsWithDefaults.has(field.name);
      questions.push(
        t.objectExpression([
          t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
          t.objectProperty(
            t.identifier('name'),
            t.stringLiteral(field.name),
          ),
          t.objectProperty(
            t.identifier('message'),
            t.stringLiteral(field.name),
          ),
          t.objectProperty(
            t.identifier('required'),
            t.booleanLiteral(isRequired),
          ),
        ]),
      );
    }
  }

  const selectObj =
    operation === 'delete'
      ? t.objectExpression([
          t.objectProperty(t.identifier(pk.name), t.booleanLiteral(true)),
        ])
      : buildSelectObject(table);

  let ormArgs: t.ObjectExpression;

  if (operation === 'create') {
    const dataProps = editableFields.map((f) =>
      t.objectProperty(
        t.identifier(f.name),
        t.memberExpression(t.identifier('cleanedData'), t.identifier(f.name)),
        false,
        true,
      ),
    );
    ormArgs = t.objectExpression([
      t.objectProperty(t.identifier('data'), t.objectExpression(dataProps)),
      t.objectProperty(t.identifier('select'), selectObj),
    ]);
  } else if (operation === 'update') {
    const dataProps = editableFields.map((f) =>
      t.objectProperty(
        t.identifier(f.name),
        t.memberExpression(t.identifier('cleanedData'), t.identifier(f.name)),
        false,
        true,
      ),
    );
    ormArgs = t.objectExpression([
      t.objectProperty(
        t.identifier('where'),
        t.objectExpression([
          t.objectProperty(
            t.identifier(pk.name),
            t.tsAsExpression(
              t.memberExpression(t.identifier('answers'), t.identifier(pk.name)),
              t.tsStringKeyword(),
            ),
          ),
        ]),
      ),
      t.objectProperty(t.identifier('data'), t.objectExpression(dataProps)),
      t.objectProperty(t.identifier('select'), selectObj),
    ]);
  } else {
    ormArgs = t.objectExpression([
      t.objectProperty(
        t.identifier('where'),
        t.objectExpression([
          t.objectProperty(
            t.identifier(pk.name),
            t.tsAsExpression(
              t.memberExpression(t.identifier('answers'), t.identifier(pk.name)),
              t.tsStringKeyword(),
            ),
          ),
        ]),
      ),
      t.objectProperty(t.identifier('select'), selectObj),
    ]);
  }

  const tryBody: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('rawAnswers'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('prompter'),
              t.identifier('prompt'),
            ),
            [t.identifier('argv'), t.arrayExpression(questions)],
          ),
        ),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('answers'),
        t.callExpression(t.identifier('coerceAnswers'), [
          t.identifier('rawAnswers'),
          t.identifier('fieldSchema'),
        ]),
      ),
    ]),
  ];

  if (operation !== 'delete') {
    tryBody.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('cleanedData'),
          t.callExpression(t.identifier('stripUndefined'), [
            t.identifier('answers'),
            t.identifier('fieldSchema'),
          ]),
        ),
      ]),
    );
  }

  tryBody.push(
    buildGetClientStatement(targetName),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          buildOrmCall(singularName, operation, ormArgs),
        ),
      ),
    ]),
    buildJsonLog(t.identifier('result')),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  const handlerName = `handle${ucFirst(operation)}`;

  return t.functionDeclaration(
    t.identifier(handlerName),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch(`Failed to ${operation} record.`),
      ),
    ]),
    false,
    true,
  );
}

export interface TableCommandOptions {
  targetName?: string;
  executorImportPath?: string;
  /** TypeRegistry from introspection, used to check field defaults */
  typeRegistry?: TypeRegistry;
}

export function generateTableCommand(table: CleanTable, options?: TableCommandOptions): GeneratedFile {
  const { singularName } = getTableNames(table);
  const commandName = toKebabCase(singularName);
  const statements: t.Statement[] = [];
  const executorPath = options?.executorImportPath ?? '../executor';

  statements.push(
    createImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );
  statements.push(
    createImportDeclaration(executorPath, ['getClient']),
  );

  const utilsPath = options?.targetName ? '../../utils' : '../utils';
  statements.push(
    createImportDeclaration(utilsPath, ['coerceAnswers', 'stripUndefined']),
  );

  // Generate field schema for type coercion
  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('fieldSchema'),
        buildFieldSchemaObject(table),
      ),
    ]),
  );

  const subcommands = ['list', 'get', 'create', 'update', 'delete'];

  const usageLines = [
    '',
    `${commandName} <command>`,
    '',
    'Commands:',
    `  list                  List all ${singularName} records`,
    `  get                   Get a ${singularName} by ID`,
    `  create                Create a new ${singularName}`,
    `  update                Update an existing ${singularName}`,
    `  delete                Delete a ${singularName}`,
    '',
    '  --help, -h            Show this help message',
    '',
  ];

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('usage'),
        t.stringLiteral(usageLines.join('\n')),
      ),
    ]),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
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
            t.memberExpression(
              t.identifier('process'),
              t.identifier('exit'),
            ),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
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
                        t.arrayExpression(
                          subcommands.map((s) => t.stringLiteral(s)),
                        ),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.returnStatement(
          t.callExpression(t.identifier('handleTableSubcommand'), [
            t.memberExpression(
              t.identifier('answer'),
              t.identifier('subcommand'),
            ),
            t.identifier('newArgv'),
            t.identifier('prompter'),
          ]),
        ),
      ]),
    ),
    t.returnStatement(
      t.callExpression(t.identifier('handleTableSubcommand'), [
        t.identifier('subcommand'),
        t.identifier('newArgv'),
        t.identifier('prompter'),
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
  argvParam2.typeAnnotation = buildArgvType();
  const prompterParam2 = t.identifier('prompter');
  prompterParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  statements.push(
    t.functionDeclaration(
      t.identifier('handleTableSubcommand'),
      [subcmdParam, argvParam2, prompterParam2],
      t.blockStatement([
        buildSubcommandSwitch(subcommands, 'handle', 'usage'),
      ]),
      false,
      true,
    ),
  );

  const tn = options?.targetName;
  statements.push(buildListHandler(table, tn));
  statements.push(buildGetHandler(table, tn));
  statements.push(buildMutationHandler(table, 'create', tn, options?.typeRegistry));
  statements.push(buildMutationHandler(table, 'update', tn, options?.typeRegistry));
  statements.push(buildMutationHandler(table, 'delete', tn, options?.typeRegistry));

  const header = getGeneratedFileHeader(`CLI commands for ${table.name}`);
  const code = generateCode(statements);

  return {
    fileName: options?.targetName
      ? `commands/${options.targetName}/${commandName}.ts`
      : `commands/${commandName}.ts`,
    content: header + '\n' + code,
  };
}
