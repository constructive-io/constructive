/**
 * Cache invalidation helpers generator
 *
 * Generates type-safe cache invalidation utilities with cascade support
 * for parent-child entity relationships.
 */
import * as t from '@babel/types';

import type { EntityRelationship, QueryKeyConfig } from '../../types/config';
import type { CleanTable } from '../../types/schema';
import {
  addJSDocComment,
  addLineComment,
  asConst,
  generateCode,
  typedParam,
} from './babel-ast';
import {
  getGeneratedFileHeader,
  getTableNames,
  lcFirst,
  ucFirst,
} from './utils';

export interface InvalidationGeneratorOptions {
  tables: CleanTable[];
  config: QueryKeyConfig;
}

export interface GeneratedInvalidationFile {
  fileName: string;
  content: string;
}

/**
 * Build a map of parent -> children for cascade invalidation
 */
function buildChildrenMap(
  relationships: Record<string, EntityRelationship>,
): Map<string, string[]> {
  const childrenMap = new Map<string, string[]>();

  for (const [child, rel] of Object.entries(relationships)) {
    const parent = rel.parent.toLowerCase();
    if (!childrenMap.has(parent)) {
      childrenMap.set(parent, []);
    }
    childrenMap.get(parent)!.push(child);
  }

  return childrenMap;
}

/**
 * Get all descendants (children, grandchildren, etc.) of an entity
 */
function getAllDescendants(
  entity: string,
  childrenMap: Map<string, string[]>,
): string[] {
  const descendants: string[] = [];
  const queue = [entity.toLowerCase()];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childrenMap.get(current) ?? [];
    for (const child of children) {
      descendants.push(child);
      queue.push(child);
    }
  }

  return descendants;
}

/**
 * Build the invalidate object property for a single entity
 */
function buildEntityInvalidateProperty(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>,
  childrenMap: Map<string, string[]>,
  allTables: CleanTable[],
): t.ObjectProperty {
  const { typeName, singularName } = getTableNames(table);
  const entityKey = typeName.toLowerCase();
  const keysName = `${lcFirst(typeName)}Keys`;

  const descendants = getAllDescendants(entityKey, childrenMap);
  const hasDescendants = descendants.length > 0;
  const relationship = relationships[entityKey];
  const hasParent = !!relationship;

  const innerProperties: t.ObjectProperty[] = [];

  // Helper to create QueryClient type reference
  const queryClientTypeRef = () =>
    t.tsTypeReference(t.identifier('QueryClient'));
  const stringOrNumberType = () =>
    t.tsUnionType([t.tsStringKeyword(), t.tsNumberKeyword()]);

  // Helper to create queryClient.invalidateQueries({ queryKey: ... })
  const invalidateCall = (queryKeyExpr: t.Expression) =>
    t.callExpression(
      t.memberExpression(
        t.identifier('queryClient'),
        t.identifier('invalidateQueries'),
      ),
      [
        t.objectExpression([
          t.objectProperty(t.identifier('queryKey'), queryKeyExpr),
        ]),
      ],
    );

  // all property
  const allArrowFn = t.arrowFunctionExpression(
    [typedParam('queryClient', queryClientTypeRef())],
    invalidateCall(
      t.memberExpression(t.identifier(keysName), t.identifier('all')),
    ),
  );
  const allProp = t.objectProperty(t.identifier('all'), allArrowFn);
  addJSDocComment(allProp, [`Invalidate all ${singularName} queries`]);
  innerProperties.push(allProp);

  // lists property
  let listsProp: t.ObjectProperty;
  if (hasParent) {
    const scopeTypeName = `${typeName}Scope`;
    const scopeParam = typedParam(
      'scope',
      t.tsTypeReference(t.identifier(scopeTypeName)),
      true,
    );
    const listsArrowFn = t.arrowFunctionExpression(
      [typedParam('queryClient', queryClientTypeRef()), scopeParam],
      invalidateCall(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('lists')),
          [t.identifier('scope')],
        ),
      ),
    );
    listsProp = t.objectProperty(t.identifier('lists'), listsArrowFn);
  } else {
    const listsArrowFn = t.arrowFunctionExpression(
      [typedParam('queryClient', queryClientTypeRef())],
      invalidateCall(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('lists')),
          [],
        ),
      ),
    );
    listsProp = t.objectProperty(t.identifier('lists'), listsArrowFn);
  }
  addJSDocComment(listsProp, [`Invalidate ${singularName} list queries`]);
  innerProperties.push(listsProp);

  // detail property
  let detailProp: t.ObjectProperty;
  if (hasParent) {
    const scopeTypeName = `${typeName}Scope`;
    const scopeParam = typedParam(
      'scope',
      t.tsTypeReference(t.identifier(scopeTypeName)),
      true,
    );
    const detailArrowFn = t.arrowFunctionExpression(
      [
        typedParam('queryClient', queryClientTypeRef()),
        typedParam('id', stringOrNumberType()),
        scopeParam,
      ],
      invalidateCall(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('detail')),
          [t.identifier('id'), t.identifier('scope')],
        ),
      ),
    );
    detailProp = t.objectProperty(t.identifier('detail'), detailArrowFn);
  } else {
    const detailArrowFn = t.arrowFunctionExpression(
      [
        typedParam('queryClient', queryClientTypeRef()),
        typedParam('id', stringOrNumberType()),
      ],
      invalidateCall(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('detail')),
          [t.identifier('id')],
        ),
      ),
    );
    detailProp = t.objectProperty(t.identifier('detail'), detailArrowFn);
  }
  addJSDocComment(detailProp, [`Invalidate a specific ${singularName}`]);
  innerProperties.push(detailProp);

  // withChildren property (cascade)
  if (hasDescendants) {
    const cascadeStatements: t.Statement[] = [];

    // Comment: Invalidate this entity
    const selfDetailStmt = t.expressionStatement(
      invalidateCall(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('detail')),
          [t.identifier('id')],
        ),
      ),
    );
    addLineComment(selfDetailStmt, `Invalidate this ${singularName}`);
    cascadeStatements.push(selfDetailStmt);

    cascadeStatements.push(
      t.expressionStatement(
        invalidateCall(
          t.callExpression(
            t.memberExpression(t.identifier(keysName), t.identifier('lists')),
            [],
          ),
        ),
      ),
    );

    // Comment: Cascade to child entities
    let firstCascade = true;
    for (const descendant of descendants) {
      const descendantTable = allTables.find(
        (tbl) => getTableNames(tbl).typeName.toLowerCase() === descendant,
      );
      if (descendantTable) {
        const { typeName: descTypeName } = getTableNames(descendantTable);
        const descRel = relationships[descendant];

        if (descRel) {
          let fkField: string | null = null;
          if (descRel.parent.toLowerCase() === entityKey) {
            fkField = descRel.foreignKey;
          } else if (descRel.ancestors?.includes(typeName.toLowerCase())) {
            fkField = `${lcFirst(typeName)}Id`;
          }

          const descKeysName = `${lcFirst(descTypeName)}Keys`;
          let cascadeStmt: t.Statement;
          if (fkField) {
            cascadeStmt = t.expressionStatement(
              invalidateCall(
                t.callExpression(
                  t.memberExpression(
                    t.identifier(descKeysName),
                    t.identifier(`by${ucFirst(typeName)}`),
                  ),
                  [t.identifier('id')],
                ),
              ),
            );
          } else {
            cascadeStmt = t.expressionStatement(
              invalidateCall(
                t.memberExpression(
                  t.identifier(descKeysName),
                  t.identifier('all'),
                ),
              ),
            );
          }

          if (firstCascade) {
            addLineComment(cascadeStmt, 'Cascade to child entities');
            firstCascade = false;
          }
          cascadeStatements.push(cascadeStmt);
        }
      }
    }

    const withChildrenArrowFn = t.arrowFunctionExpression(
      [
        typedParam('queryClient', queryClientTypeRef()),
        typedParam('id', stringOrNumberType()),
      ],
      t.blockStatement(cascadeStatements),
    );
    const withChildrenProp = t.objectProperty(
      t.identifier('withChildren'),
      withChildrenArrowFn,
    );
    addJSDocComment(withChildrenProp, [
      `Invalidate ${singularName} and all child entities`,
      `Cascades to: ${descendants.join(', ')}`,
    ]);
    innerProperties.push(withChildrenProp);
  }

  const entityProp = t.objectProperty(
    t.identifier(singularName),
    t.objectExpression(innerProperties),
  );
  addJSDocComment(entityProp, [`Invalidate ${singularName} queries`]);
  return entityProp;
}

/**
 * Build the remove object property for a single entity
 */
function buildEntityRemoveProperty(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>,
): t.ObjectProperty {
  const { typeName, singularName } = getTableNames(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const relationship = relationships[typeName.toLowerCase()];

  // Helper types
  const queryClientTypeRef = () =>
    t.tsTypeReference(t.identifier('QueryClient'));
  const stringOrNumberType = () =>
    t.tsUnionType([t.tsStringKeyword(), t.tsNumberKeyword()]);

  // Helper to create queryClient.removeQueries({ queryKey: ... })
  const removeCall = (queryKeyExpr: t.Expression) =>
    t.callExpression(
      t.memberExpression(
        t.identifier('queryClient'),
        t.identifier('removeQueries'),
      ),
      [
        t.objectExpression([
          t.objectProperty(t.identifier('queryKey'), queryKeyExpr),
        ]),
      ],
    );

  let removeProp: t.ObjectProperty;
  if (relationship) {
    const scopeTypeName = `${typeName}Scope`;
    const scopeParam = typedParam(
      'scope',
      t.tsTypeReference(t.identifier(scopeTypeName)),
      true,
    );
    const removeArrowFn = t.arrowFunctionExpression(
      [
        typedParam('queryClient', queryClientTypeRef()),
        typedParam('id', stringOrNumberType()),
        scopeParam,
      ],
      t.blockStatement([
        t.expressionStatement(
          removeCall(
            t.callExpression(
              t.memberExpression(
                t.identifier(keysName),
                t.identifier('detail'),
              ),
              [t.identifier('id'), t.identifier('scope')],
            ),
          ),
        ),
      ]),
    );
    removeProp = t.objectProperty(t.identifier(singularName), removeArrowFn);
  } else {
    const removeArrowFn = t.arrowFunctionExpression(
      [
        typedParam('queryClient', queryClientTypeRef()),
        typedParam('id', stringOrNumberType()),
      ],
      t.blockStatement([
        t.expressionStatement(
          removeCall(
            t.callExpression(
              t.memberExpression(
                t.identifier(keysName),
                t.identifier('detail'),
              ),
              [t.identifier('id')],
            ),
          ),
        ),
      ]),
    );
    removeProp = t.objectProperty(t.identifier(singularName), removeArrowFn);
  }

  addJSDocComment(removeProp, [`Remove ${singularName} from cache`]);
  return removeProp;
}

/**
 * Generate the complete invalidation.ts file
 */
export function generateInvalidationFile(
  options: InvalidationGeneratorOptions,
): GeneratedInvalidationFile {
  const { tables, config } = options;
  const { relationships, generateCascadeHelpers } = config;

  const childrenMap = buildChildrenMap(relationships);

  const statements: t.Statement[] = [];

  // Import QueryClient type
  const queryClientImport = t.importDeclaration(
    [
      t.importSpecifier(
        t.identifier('QueryClient'),
        t.identifier('QueryClient'),
      ),
    ],
    t.stringLiteral('@tanstack/react-query'),
  );
  queryClientImport.importKind = 'type';
  statements.push(queryClientImport);

  // Import query keys
  const keyImports: string[] = [];
  for (const table of tables) {
    const { typeName } = getTableNames(table);
    keyImports.push(`${lcFirst(typeName)}Keys`);
  }
  statements.push(
    t.importDeclaration(
      keyImports.map((name) =>
        t.importSpecifier(t.identifier(name), t.identifier(name)),
      ),
      t.stringLiteral('./query-keys'),
    ),
  );

  // Import scope types if needed
  const scopeTypes: string[] = [];
  for (const table of tables) {
    const { typeName } = getTableNames(table);
    if (relationships[typeName.toLowerCase()]) {
      scopeTypes.push(`${typeName}Scope`);
    }
  }
  if (scopeTypes.length > 0) {
    const scopeImport = t.importDeclaration(
      scopeTypes.map((name) =>
        t.importSpecifier(t.identifier(name), t.identifier(name)),
      ),
      t.stringLiteral('./query-keys'),
    );
    scopeImport.importKind = 'type';
    statements.push(scopeImport);
  }

  // Generate invalidate object
  const invalidateProperties: t.ObjectProperty[] = [];
  for (const table of tables) {
    invalidateProperties.push(
      buildEntityInvalidateProperty(table, relationships, childrenMap, tables),
    );
  }

  const invalidateDecl = t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('invalidate'),
        asConst(t.objectExpression(invalidateProperties)),
      ),
    ]),
  );

  // Build JSDoc for invalidate
  const invalidateDocLines = [
    'Type-safe query invalidation helpers',
    '',
    '@example',
    '```ts',
    '// Invalidate all user queries',
    'invalidate.user.all(queryClient);',
    '',
    '// Invalidate user lists',
    'invalidate.user.lists(queryClient);',
    '',
    '// Invalidate specific user',
    'invalidate.user.detail(queryClient, userId);',
  ];
  if (generateCascadeHelpers && Object.keys(relationships).length > 0) {
    invalidateDocLines.push('');
    invalidateDocLines.push('// Cascade invalidate (entity + all children)');
    invalidateDocLines.push(
      'invalidate.database.withChildren(queryClient, databaseId);',
    );
  }
  invalidateDocLines.push('```');
  addJSDocComment(invalidateDecl, invalidateDocLines);
  statements.push(invalidateDecl);

  // Generate remove object
  const removeProperties: t.ObjectProperty[] = [];
  for (const table of tables) {
    removeProperties.push(buildEntityRemoveProperty(table, relationships));
  }

  const removeDecl = t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('remove'),
        asConst(t.objectExpression(removeProperties)),
      ),
    ]),
  );
  addJSDocComment(removeDecl, [
    'Remove queries from cache (for delete operations)',
    '',
    'Use these when an entity is deleted to remove it from cache',
    'instead of just invalidating (which would trigger a refetch).',
  ]);
  statements.push(removeDecl);

  // Generate code from AST
  const code = generateCode(statements);

  // Build final content with header and section comments
  const header = getGeneratedFileHeader('Cache invalidation helpers');
  const description = `// ============================================================================
// Type-safe cache invalidation utilities
//
// Features:
// - Simple invalidation helpers per entity
// - Cascade invalidation for parent-child relationships
// - Remove helpers for delete operations
// ============================================================================`;

  let content = `${header}

${description}

`;

  // Insert section comments into the generated code
  const codeLines = code.split('\n');
  let addedInvalidationSection = false;
  let addedRemoveSection = false;

  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i];

    // Detect invalidation section (after imports)
    if (
      !addedInvalidationSection &&
      line.includes('* Type-safe query invalidation helpers')
    ) {
      content += `// ============================================================================
// Invalidation Helpers
// ============================================================================

`;
      addedInvalidationSection = true;
    }

    // Detect remove section
    if (!addedRemoveSection && line.includes('* Remove queries from cache')) {
      content += `
// ============================================================================
// Remove Helpers (for delete operations)
// ============================================================================

`;
      addedRemoveSection = true;
    }

    content += line + '\n';
  }

  return {
    fileName: 'invalidation.ts',
    content,
  };
}
