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

export interface HelpersGeneratorInput {
  name: string;
  ormImportPath: string;
}

/**
 * Generate helpers.ts with typed per-target client factories.
 *
 * Each target gets a `createXxxClient(contextName?)` function that uses
 * `store.getClientConfig(targetName, contextName)` under the hood with
 * 3-tier resolution: appstash store -> env vars -> throw.
 *
 * Also re-exports the store for direct config/var access.
 */
export function generateHelpersFile(
  toolName: string,
  targets: HelpersGeneratorInput[],
): GeneratedFile {
  const statements: t.Statement[] = [];

  // import { createConfigStore } from 'appstash';
  statements.push(
    createImportDeclaration('appstash', ['createConfigStore']),
  );
  // import type { ClientConfig } from 'appstash';
  statements.push(
    createImportDeclaration('appstash', ['ClientConfig'], true),
  );

  // Import createClient from each target's ORM
  for (const target of targets) {
    const aliasName = `create${target.name[0].toUpperCase()}${target.name.slice(1)}OrmClient`;
    const specifier = t.importSpecifier(
      t.identifier(aliasName),
      t.identifier('createClient'),
    );
    statements.push(
      t.importDeclaration([specifier], t.stringLiteral(target.ormImportPath)),
    );
  }

  // const store = createConfigStore('toolName');
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

  // export const getStore = () => store;
  const getStoreExport = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('getStore'),
      t.arrowFunctionExpression([], t.identifier('store')),
    ),
  ]);
  statements.push(t.exportNamedDeclaration(getStoreExport));

  // export function getClientConfig(targetName: string, contextName?: string): ClientConfig
  const targetNameParam = t.identifier('targetName');
  targetNameParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const contextNameParam = t.identifier('contextName');
  contextNameParam.optional = true;
  contextNameParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

  const getClientConfigBody = t.blockStatement([
    t.returnStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier('store'),
          t.identifier('getClientConfig'),
        ),
        [t.identifier('targetName'), t.identifier('contextName')],
      ),
    ),
  ]);

  const getClientConfigFunc = t.functionDeclaration(
    t.identifier('getClientConfig'),
    [targetNameParam, contextNameParam],
    getClientConfigBody,
  );
  // Add return type annotation
  const returnTypeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('ClientConfig')),
  );
  getClientConfigFunc.returnType = returnTypeAnnotation;
  statements.push(t.exportNamedDeclaration(getClientConfigFunc));

  // Generate typed factory for each target
  for (const target of targets) {
    const factoryName = `create${target.name[0].toUpperCase()}${target.name.slice(1)}Client`;
    const ormAliasName = `create${target.name[0].toUpperCase()}${target.name.slice(1)}OrmClient`;

    const ctxParam = t.identifier('contextName');
    ctxParam.optional = true;
    ctxParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

    const factoryBody = t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('config'),
          t.callExpression(
            t.memberExpression(
              t.identifier('store'),
              t.identifier('getClientConfig'),
            ),
            [t.stringLiteral(target.name), t.identifier('contextName')],
          ),
        ),
      ]),
      t.returnStatement(
        t.callExpression(t.identifier(ormAliasName), [
          t.objectExpression([
            t.objectProperty(
              t.identifier('endpoint'),
              t.memberExpression(
                t.identifier('config'),
                t.identifier('endpoint'),
              ),
            ),
            t.objectProperty(
              t.identifier('headers'),
              t.memberExpression(
                t.identifier('config'),
                t.identifier('headers'),
              ),
            ),
          ]),
        ]),
      ),
    ]);

    const factoryFunc = t.functionDeclaration(
      t.identifier(factoryName),
      [ctxParam],
      factoryBody,
    );
    statements.push(t.exportNamedDeclaration(factoryFunc));
  }

  const header = getGeneratedFileHeader(
    'SDK helpers — typed per-target client factories with 3-tier credential resolution',
  );
  const code = generateCode(statements);

  return {
    fileName: 'helpers.ts',
    content: header + '\n' + code,
  };
}
