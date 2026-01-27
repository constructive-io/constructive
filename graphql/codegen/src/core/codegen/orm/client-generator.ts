/**
 * ORM Client generator (Babel AST-based)
 *
 * Generates the createClient() factory function and main client file.
 */
import type { CleanTable } from '../../../types/schema';
import * as t from '@babel/types';
import { generateCode, commentBlock } from '../babel-ast';
import { getTableNames, lcFirst, getGeneratedFileHeader } from '../utils';
import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedClientFile {
  fileName: string;
  content: string;
}

/**
 * Find a template file path.
 * Templates are at ../templates/ relative to this file in both src/ and dist/.
 */
function findTemplateFile(templateName: string): string {
  const templatePath = path.join(__dirname, '../templates', templateName);

  if (fs.existsSync(templatePath)) {
    return templatePath;
  }

  throw new Error(
    `Could not find template file: ${templateName}. ` +
      `Searched in: ${templatePath}`
  );
}

/**
 * Read a template file and replace the header with generated file header
 */
function readTemplateFile(templateName: string, description: string): string {
  const templatePath = findTemplateFile(templateName);
  let content = fs.readFileSync(templatePath, 'utf-8');

  // Replace the source file header comment with the generated file header
  // Match the header pattern used in template files
  const headerPattern =
    /\/\*\*[\s\S]*?\* NOTE: This file is read at codegen time and written to output\.[\s\S]*?\*\/\n*/;

  content = content.replace(
    headerPattern,
    getGeneratedFileHeader(description) + '\n'
  );

  return content;
}

/**
 * Generate the main client.ts file (OrmClient class)
 * This is the runtime client that handles GraphQL execution
 *
 * Reads from the templates directory for proper type checking.
 */
export function generateOrmClientFile(): GeneratedClientFile {
  return {
    fileName: 'client.ts',
    content: readTemplateFile('orm-client.ts', 'ORM Client - Runtime GraphQL executor'),
  };
}

/**
 * Generate the query-builder.ts file (runtime query builder)
 *
 * Reads from the templates directory for proper type checking and testability.
 */
export function generateQueryBuilderFile(): GeneratedClientFile {
  return {
    fileName: 'query-builder.ts',
    content: readTemplateFile(
      'query-builder.ts',
      'Query Builder - Builds and executes GraphQL operations'
    ),
  };
}

/**
 * Generate the select-types.ts file
 *
 * Reads from the templates directory for proper type checking.
 */
export function generateSelectTypesFile(): GeneratedClientFile {
  return {
    fileName: 'select-types.ts',
    content: readTemplateFile('select-types.ts', 'Type utilities for select inference'),
  };
}

function createImportDeclaration(
  moduleSpecifier: string,
  namedImports: string[],
  typeOnly: boolean = false
): t.ImportDeclaration {
  const specifiers = namedImports.map((name) =>
    t.importSpecifier(t.identifier(name), t.identifier(name))
  );
  const decl = t.importDeclaration(
    specifiers,
    t.stringLiteral(moduleSpecifier)
  );
  decl.importKind = typeOnly ? 'type' : 'value';
  return decl;
}

/**
 * Generate the main index.ts with createClient factory
 */
export function generateCreateClientFile(
  tables: CleanTable[],
  hasCustomQueries: boolean,
  hasCustomMutations: boolean
): GeneratedClientFile {
  const statements: t.Statement[] = [];

  // Add imports
  // Import OrmClient (value) and OrmClientConfig (type) separately
  statements.push(createImportDeclaration('./client', ['OrmClient']));
  statements.push(
    createImportDeclaration('./client', ['OrmClientConfig'], true)
  );

  // Import models
  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const modelName = `${typeName}Model`;
    const fileName = lcFirst(typeName);
    statements.push(
      createImportDeclaration(`./models/${fileName}`, [modelName])
    );
  }

  // Import custom operations
  if (hasCustomQueries) {
    statements.push(
      createImportDeclaration('./query', ['createQueryOperations'])
    );
  }
  if (hasCustomMutations) {
    statements.push(
      createImportDeclaration('./mutation', ['createMutationOperations'])
    );
  }

  // Re-export types and classes
  // export type { OrmClientConfig, QueryResult, GraphQLError, GraphQLAdapter } from './client';
  const typeExportDecl = t.exportNamedDeclaration(
    null,
    [
      t.exportSpecifier(
        t.identifier('OrmClientConfig'),
        t.identifier('OrmClientConfig')
      ),
      t.exportSpecifier(
        t.identifier('QueryResult'),
        t.identifier('QueryResult')
      ),
      t.exportSpecifier(
        t.identifier('GraphQLError'),
        t.identifier('GraphQLError')
      ),
      t.exportSpecifier(
        t.identifier('GraphQLAdapter'),
        t.identifier('GraphQLAdapter')
      ),
    ],
    t.stringLiteral('./client')
  );
  typeExportDecl.exportKind = 'type';
  statements.push(typeExportDecl);

  // export { GraphQLRequestError } from './client';
  statements.push(
    t.exportNamedDeclaration(
      null,
      [
        t.exportSpecifier(
          t.identifier('GraphQLRequestError'),
          t.identifier('GraphQLRequestError')
        ),
      ],
      t.stringLiteral('./client')
    )
  );

  // export { QueryBuilder } from './query-builder';
  statements.push(
    t.exportNamedDeclaration(
      null,
      [
        t.exportSpecifier(
          t.identifier('QueryBuilder'),
          t.identifier('QueryBuilder')
        ),
      ],
      t.stringLiteral('./query-builder')
    )
  );

  // export * from './select-types';
  statements.push(t.exportAllDeclaration(t.stringLiteral('./select-types')));

  // Re-export all models
  statements.push(t.exportAllDeclaration(t.stringLiteral('./models')));

  // Re-export custom operations
  if (hasCustomQueries) {
    statements.push(
      t.exportNamedDeclaration(
        null,
        [
          t.exportSpecifier(
            t.identifier('createQueryOperations'),
            t.identifier('createQueryOperations')
          ),
        ],
        t.stringLiteral('./query')
      )
    );
  }
  if (hasCustomMutations) {
    statements.push(
      t.exportNamedDeclaration(
        null,
        [
          t.exportSpecifier(
            t.identifier('createMutationOperations'),
            t.identifier('createMutationOperations')
          ),
        ],
        t.stringLiteral('./mutation')
      )
    );
  }

  // Build the return object properties
  const returnProperties: t.ObjectProperty[] = [];

  for (const table of tables) {
    const { typeName, singularName } = getTableNames(table);
    const modelName = `${typeName}Model`;
    returnProperties.push(
      t.objectProperty(
        t.identifier(singularName),
        t.newExpression(t.identifier(modelName), [t.identifier('client')])
      )
    );
  }

  if (hasCustomQueries) {
    returnProperties.push(
      t.objectProperty(
        t.identifier('query'),
        t.callExpression(t.identifier('createQueryOperations'), [
          t.identifier('client'),
        ])
      )
    );
  }

  if (hasCustomMutations) {
    returnProperties.push(
      t.objectProperty(
        t.identifier('mutation'),
        t.callExpression(t.identifier('createMutationOperations'), [
          t.identifier('client'),
        ])
      )
    );
  }

  // Build the createClient function body
  const clientDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('client'),
      t.newExpression(t.identifier('OrmClient'), [t.identifier('config')])
    ),
  ]);

  const returnStmt = t.returnStatement(t.objectExpression(returnProperties));

  const configParam = t.identifier('config');
  configParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('OrmClientConfig'))
  );

  const createClientFunc = t.functionDeclaration(
    t.identifier('createClient'),
    [configParam],
    t.blockStatement([clientDecl, returnStmt])
  );

  // Add JSDoc comment
  const jsdocComment = commentBlock(`*
 * Create an ORM client instance
 *
 * @example
 * \`\`\`typescript
 * const db = createClient({
 *   endpoint: 'https://api.example.com/graphql',
 *   headers: { Authorization: 'Bearer token' },
 * });
 *
 * // Query users
 * const users = await db.user.findMany({
 *   select: { id: true, name: true },
 *   first: 10,
 * }).execute();
 *
 * // Create a user
 * const newUser = await db.user.create({
 *   data: { name: 'John', email: 'john@example.com' },
 *   select: { id: true },
 * }).execute();
 * \`\`\`
 `);

  const exportedFunc = t.exportNamedDeclaration(createClientFunc);
  exportedFunc.leadingComments = [jsdocComment];
  statements.push(exportedFunc);

  const header = getGeneratedFileHeader('ORM Client - createClient factory');
  const code = generateCode(statements);

  return {
    fileName: 'index.ts',
    content: header + '\n' + code,
  };
}
