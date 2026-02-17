import * as t from '@babel/types';
import { toKebabCase } from 'komoji';

import { generateCode } from '../babel-ast';
import { getGeneratedFileHeader } from '../utils';
import type { CleanOperation } from '../../../types/schema';
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

function buildOrmCustomCall(
  opKind: 'query' | 'mutation',
  opName: string,
  argsExpr: t.Expression,
): t.Expression {
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
        [argsExpr],
      ),
      t.identifier('execute'),
    ),
    [],
  );
}

export function generateCustomCommand(op: CleanOperation): GeneratedFile {
  const commandName = toKebabCase(op.name);
  const opKind = op.kind === 'mutation' ? 'mutation' : 'query';
  const statements: t.Statement[] = [];

  statements.push(
    createImportDeclaration('inquirerer', ['CLIOptions', 'Inquirerer']),
  );
  statements.push(
    createImportDeclaration('../executor', ['getClient']),
  );

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

  bodyStatements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('client'),
        t.callExpression(t.identifier('getClient'), []),
      ),
    ]),
  );

  const argsExpr =
    op.args.length > 0
      ? t.identifier('answers')
      : t.objectExpression([]);

  bodyStatements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          buildOrmCustomCall(opKind, op.name, argsExpr),
        ),
      ),
    ]),
  );

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
    fileName: `commands/${commandName}.ts`,
    content: header + '\n' + code,
  };
}
