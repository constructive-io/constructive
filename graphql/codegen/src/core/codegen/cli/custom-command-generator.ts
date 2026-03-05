import * as t from '@babel/types';
import { toKebabCase } from 'komoji';

import { generateCode } from '../babel-ast';
import { getGeneratedFileHeader } from '../utils';
import type { CleanOperation, CleanTypeRef } from '../../../types/schema';
import type { GeneratedFile } from './executor-generator';
import { buildQuestionsArray } from './arg-mapper';

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

/**
 * Unwrap NON_NULL / LIST wrappers to get the underlying named type.
 */
function unwrapType(ref: CleanTypeRef): CleanTypeRef {
  if ((ref.kind === 'NON_NULL' || ref.kind === 'LIST') && ref.ofType) {
    return unwrapType(ref.ofType);
  }
  return ref;
}

/**
 * Check if the return type (after unwrapping) is an OBJECT type.
 */
function hasObjectReturnType(returnType: CleanTypeRef): boolean {
  const base = unwrapType(returnType);
  return base.kind === 'OBJECT';
}

/**
 * Build a default select string from the return type's top-level scalar fields.
 * For OBJECT return types with known fields, generates a comma-separated list
 * of all top-level field names (e.g. 'clientMutationId,result').
 * Falls back to 'clientMutationId' for mutations without known fields.
 */
function buildDefaultSelectString(
  returnType: CleanTypeRef,
  isMutation: boolean,
): string {
  const base = unwrapType(returnType);
  if (base.fields && base.fields.length > 0) {
    return base.fields.map((f) => f.name).join(',');
  }
  if (isMutation) {
    return 'clientMutationId';
  }
  return '';
}

function buildOrmCustomCall(
  opKind: 'query' | 'mutation',
  opName: string,
  argsExpr: t.Expression,
  selectExpr?: t.Expression,
  hasArgs: boolean = true,
): t.Expression {
  const callArgs: t.Expression[] = [];
  if (hasArgs) {
    // Operation has arguments: pass args as first param, select as second
    callArgs.push(argsExpr);
    if (selectExpr) {
      callArgs.push(
        t.tsAsExpression(
          t.objectExpression([
            t.objectProperty(t.identifier('select'), selectExpr),
          ]),
          t.tsAnyKeyword(),
        ),
      );
    }
  } else if (selectExpr) {
    // No arguments: pass { select } as the only param (ORM signature)
    // Cast to any to satisfy strict ORM type signatures
    callArgs.push(
      t.tsAsExpression(
        t.objectExpression([
          t.objectProperty(t.identifier('select'), selectExpr),
        ]),
        t.tsAnyKeyword(),
      ),
    );
  }
  return t.callExpression(
    t.memberExpression(
      t.callExpression(
        t.memberExpression(
          t.memberExpression(
            t.identifier('client'),
            t.identifier(opKind),
          ),
          t.identifier(opName),
        ),
        callArgs,
      ),
      t.identifier('execute'),
    ),
    [],
  );
}

export interface CustomCommandOptions {
  targetName?: string;
  executorImportPath?: string;
  saveToken?: boolean;
}

export function generateCustomCommand(op: CleanOperation, options?: CustomCommandOptions): GeneratedFile {
  const commandName = toKebabCase(op.name);
  const opKind = op.kind === 'mutation' ? 'mutation' : 'query';
  const statements: t.Statement[] = [];
  const executorPath = options?.executorImportPath ?? '../executor';
  const imports = ['getClient'];
  if (options?.saveToken) {
    imports.push('getStore');
  }

  // Check if any argument is an INPUT_OBJECT (i.e. takes JSON input like { input: SomeInput })
  const hasInputObjectArg = op.args.some((arg) => {
    const base = unwrapType(arg.type);
    return base.kind === 'INPUT_OBJECT';
  });

  // Check if return type is OBJECT (needs --select flag)
  const isObjectReturn = hasObjectReturnType(op.returnType);

  const utilsPath = options?.executorImportPath
    ? options.executorImportPath.replace(/\/executor$/, '/utils')
    : '../utils';

  statements.push(
    createImportDeclaration('inquirerer', ['CLIOptions', 'Inquirerer']),
  );
  statements.push(
    createImportDeclaration(executorPath, imports),
  );

  // Build the list of utils imports needed
  const utilsImports: string[] = [];
  if (hasInputObjectArg) {
    utilsImports.push('parseMutationInput');
  }
  if (isObjectReturn) {
    utilsImports.push('buildSelectFromPaths');
  }
  if (utilsImports.length > 0) {
    statements.push(
      createImportDeclaration(utilsPath, utilsImports),
    );
  }

  const questionsArray =
    op.args.length > 0
      ? buildQuestionsArray(op.args)
      : t.arrayExpression([]);

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

  const bodyStatements: t.Statement[] = [
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
            [
              t.stringLiteral(
                `${commandName} - ${op.description || op.name}\n\nUsage: ${commandName} [OPTIONS]\n`,
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
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
  ];

  if (op.args.length > 0) {
    bodyStatements.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('answers'),
          t.awaitExpression(
            t.callExpression(
              t.memberExpression(
                t.identifier('prompter'),
                t.identifier('prompt'),
              ),
              [t.identifier('argv'), questionsArray],
            ),
          ),
        ),
      ]),
    );
  }

  const getClientArgs: t.Expression[] = options?.targetName
    ? [t.stringLiteral(options.targetName)]
    : [];
  bodyStatements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('client'),
        t.callExpression(t.identifier('getClient'), getClientArgs),
      ),
    ]),
  );

  // For mutations with INPUT_OBJECT args (like `input: SignUpInput`),
  // parse JSON strings from CLI into proper objects
  if (hasInputObjectArg && op.args.length > 0) {
    bodyStatements.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('parsedAnswers'),
          t.callExpression(t.identifier('parseMutationInput'), [
            t.identifier('answers'),
          ]),
        ),
      ]),
    );
  }

  const argsExpr =
    op.args.length > 0
      ? t.tsAsExpression(
          hasInputObjectArg
            ? t.identifier('parsedAnswers')
            : t.identifier('answers'),
          t.tsAnyKeyword(),
        )
      : t.objectExpression([]);

  // For OBJECT return types, generate runtime select from --select flag
  // For scalar return types, no select is needed
  let selectExpr: t.Expression | undefined;
  if (isObjectReturn) {
    const defaultSelect = buildDefaultSelectString(op.returnType, op.kind === 'mutation');
    // Generate: const selectFields = buildSelectFromPaths((argv.select as string) ?? 'defaultFields')
    bodyStatements.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('selectFields'),
          t.callExpression(t.identifier('buildSelectFromPaths'), [
            t.logicalExpression(
              '??',
              t.tsAsExpression(
                t.memberExpression(t.identifier('argv'), t.identifier('select')),
                t.tsStringKeyword(),
              ),
              t.stringLiteral(defaultSelect),
            ),
          ]),
        ),
      ]),
    );
    selectExpr = t.identifier('selectFields');
  }

  const hasArgs = op.args.length > 0;
  bodyStatements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          buildOrmCustomCall(opKind, op.name, argsExpr, selectExpr, hasArgs),
        ),
      ),
    ]),
  );

  if (options?.saveToken) {
    bodyStatements.push(
      t.ifStatement(
        t.logicalExpression(
          '&&',
          t.memberExpression(t.identifier('argv'), t.identifier('saveToken')),
          t.identifier('result'),
        ),
        t.blockStatement([
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('tokenValue'),
              t.logicalExpression(
                '||',
                t.memberExpression(t.identifier('result'), t.identifier('token'), false),
                t.logicalExpression(
                  '||',
                  t.memberExpression(t.identifier('result'), t.identifier('jwtToken'), false),
                  t.memberExpression(t.identifier('result'), t.identifier('accessToken'), false),
                ),
              ),
            ),
          ]),
          t.ifStatement(
            t.identifier('tokenValue'),
            t.blockStatement([
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier('s'),
                  t.callExpression(t.identifier('getStore'), []),
                ),
              ]),
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier('ctx'),
                  t.callExpression(
                    t.memberExpression(t.identifier('s'), t.identifier('getCurrentContext')),
                    [],
                  ),
                ),
              ]),
              t.ifStatement(
                t.identifier('ctx'),
                t.blockStatement([
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(t.identifier('s'), t.identifier('setCredentials')),
                      [
                        t.memberExpression(t.identifier('ctx'), t.identifier('name')),
                        t.objectExpression([
                          t.objectProperty(
                            t.identifier('token'),
                            t.identifier('tokenValue'),
                          ),
                        ]),
                      ],
                    ),
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(t.identifier('console'), t.identifier('log')),
                      [t.stringLiteral('Token saved to current context.')],
                    ),
                  ),
                ]),
              ),
            ]),
          ),
        ]),
      ),
    );
  }

  bodyStatements.push(buildJsonLog(t.identifier('result')));

  const tryBlock = t.tryStatement(
    t.blockStatement(bodyStatements),
    buildErrorCatch(`Failed: ${op.name}`),
  );

  statements.push(
    t.exportDefaultDeclaration(
      t.arrowFunctionExpression(
        [argvParam, prompterParam, optionsParam],
        t.blockStatement([tryBlock]),
        true,
      ),
    ),
  );

  const header = getGeneratedFileHeader(
    `CLI command for ${op.kind} ${op.name}`,
  );
  const code = generateCode(statements);

  return {
    fileName: options?.targetName
      ? `commands/${options.targetName}/${commandName}.ts`
      : `commands/${commandName}.ts`,
    content: header + '\n' + code,
  };
}
