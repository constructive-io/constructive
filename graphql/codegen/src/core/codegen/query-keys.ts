/**
 * Query key factory generator
 *
 * Generates centralized query keys following the lukemorales query-key-factory pattern.
 * Supports hierarchical scoped keys for parent-child entity relationships.
 *
 * Uses Babel AST for code generation - no string concatenation.
 *
 * @see https://tanstack.com/query/docs/framework/react/community/lukemorales-query-key-factory
 */
import * as t from '@babel/types';

import type { EntityRelationship, QueryKeyConfig } from '../../types/config';
import type { CleanOperation, CleanTable } from '../../types/schema';
import {
  addJSDocComment,
  asConst,
  constArray,
  generateCode,
  keyofTypeof,
  typedParam,
} from './babel-ast';
import {
  getGeneratedFileHeader,
  getTableNames,
  lcFirst,
  ucFirst,
} from './utils';

export interface QueryKeyGeneratorOptions {
  tables: CleanTable[];
  customQueries: CleanOperation[];
  config: QueryKeyConfig;
}

export interface GeneratedQueryKeysFile {
  fileName: string;
  content: string;
}

/**
 * Get all ancestor entities for a given entity based on relationships
 */
function getAncestors(
  entityName: string,
  relationships: Record<string, EntityRelationship>,
): string[] {
  const relationship = relationships[entityName.toLowerCase()];
  if (!relationship) return [];

  if (relationship.ancestors && relationship.ancestors.length > 0) {
    return relationship.ancestors;
  }

  const ancestors: string[] = [];
  let current = relationship.parent;
  while (current) {
    ancestors.push(current);
    const parentRel = relationships[current.toLowerCase()];
    current = parentRel?.parent ?? null;
  }
  return ancestors;
}

/**
 * Generate scope type declaration for an entity
 */
function generateScopeTypeDeclaration(
  entityName: string,
  relationships: Record<string, EntityRelationship>,
): t.ExportNamedDeclaration | null {
  const relationship = relationships[entityName.toLowerCase()];
  if (!relationship) return null;

  const ancestors = getAncestors(entityName, relationships);
  const allParents = [relationship.parent, ...ancestors];

  const typeName = `${ucFirst(entityName)}Scope`;
  const members: t.TSPropertySignature[] = [];

  for (const parent of allParents) {
    const rel = relationships[entityName.toLowerCase()];
    let fkField = `${lcFirst(parent)}Id`;
    if (rel && rel.parent === parent) {
      fkField = rel.foreignKey;
    } else {
      const directRel = Object.entries(relationships).find(
        ([, r]) => r.parent === parent,
      );
      if (directRel) {
        fkField = directRel[1].foreignKey;
      }
    }

    const signature = t.tsPropertySignature(
      t.identifier(fkField),
      t.tsTypeAnnotation(t.tsStringKeyword()),
    );
    signature.optional = true;
    members.push(signature);
  }

  return t.exportNamedDeclaration(
    t.tsTypeAliasDeclaration(
      t.identifier(typeName),
      null,
      t.tsTypeLiteral(members),
    ),
  );
}

/**
 * Build the 'all' property: all: ['entityKey'] as const
 */
function buildAllProperty(
  entityKey: string,
  singularName: string,
): t.ObjectProperty {
  const prop = t.objectProperty(
    t.identifier('all'),
    constArray([t.stringLiteral(entityKey)]),
  );
  addJSDocComment(prop, [`All ${singularName} queries`]);
  return prop;
}

/**
 * Build a byParent property for scoped keys
 */
function buildByParentProperty(
  entityKey: string,
  typeName: string,
  parent: string,
  fkField: string,
): t.ObjectProperty {
  const parentUpper = ucFirst(parent);
  const parentLower = lcFirst(parent);

  const arrowFn = t.arrowFunctionExpression(
    [typedParam(fkField, t.tsStringKeyword())],
    constArray([
      t.stringLiteral(entityKey),
      t.objectExpression([
        t.objectProperty(
          t.identifier(fkField),
          t.identifier(fkField),
          false,
          true,
        ),
      ]),
    ]),
  );

  const prop = t.objectProperty(t.identifier(`by${parentUpper}`), arrowFn);
  addJSDocComment(prop, [
    `${typeName} queries scoped to a specific ${parentLower}`,
  ]);
  return prop;
}

/**
 * Build the scoped helper function property
 */
function buildScopedProperty(
  keysName: string,
  typeName: string,
  relationship: EntityRelationship,
  ancestors: string[],
): t.ObjectProperty {
  const scopeTypeName = `${typeName}Scope`;
  const scopeParam = typedParam(
    'scope',
    t.tsTypeReference(t.identifier(scopeTypeName)),
    true,
  );

  const statements: t.Statement[] = [];

  if (relationship.parent) {
    statements.push(
      t.ifStatement(
        t.optionalMemberExpression(
          t.identifier('scope'),
          t.identifier(relationship.foreignKey),
          false,
          true,
        ),
        t.blockStatement([
          t.returnStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier(keysName),
                t.identifier(`by${ucFirst(relationship.parent)}`),
              ),
              [
                t.memberExpression(
                  t.identifier('scope'),
                  t.identifier(relationship.foreignKey),
                ),
              ],
            ),
          ),
        ]),
      ),
    );
  }

  for (const ancestor of ancestors) {
    const ancestorLower = lcFirst(ancestor);
    const fkField = `${ancestorLower}Id`;
    statements.push(
      t.ifStatement(
        t.optionalMemberExpression(
          t.identifier('scope'),
          t.identifier(fkField),
          false,
          true,
        ),
        t.blockStatement([
          t.returnStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier(keysName),
                t.identifier(`by${ucFirst(ancestor)}`),
              ),
              [
                t.memberExpression(
                  t.identifier('scope'),
                  t.identifier(fkField),
                ),
              ],
            ),
          ),
        ]),
      ),
    );
  }

  statements.push(
    t.returnStatement(
      t.memberExpression(t.identifier(keysName), t.identifier('all')),
    ),
  );

  const arrowFn = t.arrowFunctionExpression(
    [scopeParam],
    t.blockStatement(statements),
  );

  const prop = t.objectProperty(t.identifier('scoped'), arrowFn);
  addJSDocComment(prop, ['Get scope-aware base key']);
  return prop;
}

/**
 * Build lists property (scoped version)
 */
function buildScopedListsProperty(
  keysName: string,
  scopeTypeName: string,
): t.ObjectProperty {
  const scopeParam = typedParam(
    'scope',
    t.tsTypeReference(t.identifier(scopeTypeName)),
    true,
  );

  const arrowFn = t.arrowFunctionExpression(
    [scopeParam],
    constArray([
      t.spreadElement(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('scoped')),
          [t.identifier('scope')],
        ),
      ),
      t.stringLiteral('list'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('lists'), arrowFn);
  addJSDocComment(prop, ['List query keys (optionally scoped)']);
  return prop;
}

/**
 * Build list property (scoped version)
 */
function buildScopedListProperty(
  keysName: string,
  scopeTypeName: string,
): t.ObjectProperty {
  const variablesParam = typedParam(
    'variables',
    t.tsTypeReference(t.identifier('object')),
    true,
  );
  const scopeParam = typedParam(
    'scope',
    t.tsTypeReference(t.identifier(scopeTypeName)),
    true,
  );

  const arrowFn = t.arrowFunctionExpression(
    [variablesParam, scopeParam],
    constArray([
      t.spreadElement(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('lists')),
          [t.identifier('scope')],
        ),
      ),
      t.identifier('variables'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('list'), arrowFn);
  addJSDocComment(prop, ['List query key with variables']);
  return prop;
}

/**
 * Build details property (scoped version)
 */
function buildScopedDetailsProperty(
  keysName: string,
  scopeTypeName: string,
): t.ObjectProperty {
  const scopeParam = typedParam(
    'scope',
    t.tsTypeReference(t.identifier(scopeTypeName)),
    true,
  );

  const arrowFn = t.arrowFunctionExpression(
    [scopeParam],
    constArray([
      t.spreadElement(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('scoped')),
          [t.identifier('scope')],
        ),
      ),
      t.stringLiteral('detail'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('details'), arrowFn);
  addJSDocComment(prop, ['Detail query keys (optionally scoped)']);
  return prop;
}

/**
 * Build detail property (scoped version)
 */
function buildScopedDetailProperty(
  keysName: string,
  scopeTypeName: string,
): t.ObjectProperty {
  const idParam = typedParam(
    'id',
    t.tsUnionType([t.tsStringKeyword(), t.tsNumberKeyword()]),
  );
  const scopeParam = typedParam(
    'scope',
    t.tsTypeReference(t.identifier(scopeTypeName)),
    true,
  );

  const arrowFn = t.arrowFunctionExpression(
    [idParam, scopeParam],
    constArray([
      t.spreadElement(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('details')),
          [t.identifier('scope')],
        ),
      ),
      t.identifier('id'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('detail'), arrowFn);
  addJSDocComment(prop, ['Detail query key for specific item']);
  return prop;
}

/**
 * Build simple (non-scoped) lists property
 */
function buildSimpleListsProperty(keysName: string): t.ObjectProperty {
  const arrowFn = t.arrowFunctionExpression(
    [],
    constArray([
      t.spreadElement(
        t.memberExpression(t.identifier(keysName), t.identifier('all')),
      ),
      t.stringLiteral('list'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('lists'), arrowFn);
  addJSDocComment(prop, ['List query keys']);
  return prop;
}

/**
 * Build simple (non-scoped) list property
 */
function buildSimpleListProperty(keysName: string): t.ObjectProperty {
  const variablesParam = typedParam(
    'variables',
    t.tsTypeReference(t.identifier('object')),
    true,
  );

  const arrowFn = t.arrowFunctionExpression(
    [variablesParam],
    constArray([
      t.spreadElement(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('lists')),
          [],
        ),
      ),
      t.identifier('variables'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('list'), arrowFn);
  addJSDocComment(prop, ['List query key with variables']);
  return prop;
}

/**
 * Build simple (non-scoped) details property
 */
function buildSimpleDetailsProperty(keysName: string): t.ObjectProperty {
  const arrowFn = t.arrowFunctionExpression(
    [],
    constArray([
      t.spreadElement(
        t.memberExpression(t.identifier(keysName), t.identifier('all')),
      ),
      t.stringLiteral('detail'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('details'), arrowFn);
  addJSDocComment(prop, ['Detail query keys']);
  return prop;
}

/**
 * Build simple (non-scoped) detail property
 */
function buildSimpleDetailProperty(keysName: string): t.ObjectProperty {
  const idParam = typedParam(
    'id',
    t.tsUnionType([t.tsStringKeyword(), t.tsNumberKeyword()]),
  );

  const arrowFn = t.arrowFunctionExpression(
    [idParam],
    constArray([
      t.spreadElement(
        t.callExpression(
          t.memberExpression(t.identifier(keysName), t.identifier('details')),
          [],
        ),
      ),
      t.identifier('id'),
    ]),
  );

  const prop = t.objectProperty(t.identifier('detail'), arrowFn);
  addJSDocComment(prop, ['Detail query key for specific item']);
  return prop;
}

/**
 * Generate query keys declaration for a single table entity
 */
function generateEntityKeysDeclaration(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>,
  generateScopedKeys: boolean,
): t.ExportNamedDeclaration {
  const { typeName, singularName } = getTableNames(table);
  const entityKey = typeName.toLowerCase();
  const keysName = `${lcFirst(typeName)}Keys`;

  const relationship = relationships[entityKey];
  const hasRelationship = !!relationship && generateScopedKeys;

  const properties: t.ObjectProperty[] = [];

  properties.push(buildAllProperty(entityKey, singularName));

  if (hasRelationship) {
    const ancestors = getAncestors(typeName, relationships);
    const allParents = [relationship.parent, ...ancestors];

    for (const parent of allParents) {
      let fkField = `${lcFirst(parent)}Id`;
      if (relationship.parent === parent) {
        fkField = relationship.foreignKey;
      }
      properties.push(
        buildByParentProperty(entityKey, typeName, parent, fkField),
      );
    }

    properties.push(
      buildScopedProperty(keysName, typeName, relationship, ancestors),
    );

    const scopeTypeName = `${typeName}Scope`;
    properties.push(buildScopedListsProperty(keysName, scopeTypeName));
    properties.push(buildScopedListProperty(keysName, scopeTypeName));
    properties.push(buildScopedDetailsProperty(keysName, scopeTypeName));
    properties.push(buildScopedDetailProperty(keysName, scopeTypeName));
  } else {
    properties.push(buildSimpleListsProperty(keysName));
    properties.push(buildSimpleListProperty(keysName));
    properties.push(buildSimpleDetailsProperty(keysName));
    properties.push(buildSimpleDetailProperty(keysName));
  }

  return t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(keysName),
        asConst(t.objectExpression(properties)),
      ),
    ]),
  );
}

/**
 * Generate query keys declaration for custom operations
 */
function generateCustomQueryKeysDeclaration(
  operations: CleanOperation[],
): t.ExportNamedDeclaration | null {
  if (operations.length === 0) return null;

  const properties: t.ObjectProperty[] = [];

  for (const op of operations) {
    const hasArgs = op.args.length > 0;
    const hasRequiredArgs = op.args.some((arg) => arg.type.kind === 'NON_NULL');

    let prop: t.ObjectProperty;

    if (hasArgs) {
      const variablesParam = typedParam(
        'variables',
        t.tsTypeReference(t.identifier('object')),
        !hasRequiredArgs,
      );

      const arrowFn = t.arrowFunctionExpression(
        [variablesParam],
        constArray([t.stringLiteral(op.name), t.identifier('variables')]),
      );

      prop = t.objectProperty(t.identifier(op.name), arrowFn);
    } else {
      const arrowFn = t.arrowFunctionExpression(
        [],
        constArray([t.stringLiteral(op.name)]),
      );

      prop = t.objectProperty(t.identifier(op.name), arrowFn);
    }

    addJSDocComment(prop, [`Query key for ${op.name}`]);
    properties.push(prop);
  }

  return t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('customQueryKeys'),
        asConst(t.objectExpression(properties)),
      ),
    ]),
  );
}

/**
 * Generate the unified query keys store declaration
 */
function generateUnifiedStoreDeclaration(
  tables: CleanTable[],
  hasCustomQueries: boolean,
): t.ExportNamedDeclaration {
  const properties: t.ObjectProperty[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const keysName = `${lcFirst(typeName)}Keys`;
    properties.push(
      t.objectProperty(t.identifier(lcFirst(typeName)), t.identifier(keysName)),
    );
  }

  if (hasCustomQueries) {
    properties.push(
      t.objectProperty(t.identifier('custom'), t.identifier('customQueryKeys')),
    );
  }

  const decl = t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('queryKeys'),
        asConst(t.objectExpression(properties)),
      ),
    ]),
  );

  addJSDocComment(decl, [
    'Unified query key store',
    '',
    'Use this for type-safe query key access across your application.',
    '',
    '@example',
    '```ts',
    '// Invalidate all user queries',
    'queryClient.invalidateQueries({ queryKey: queryKeys.user.all });',
    '',
    '// Invalidate user list queries',
    'queryClient.invalidateQueries({ queryKey: queryKeys.user.lists() });',
    '',
    '// Invalidate specific user',
    'queryClient.invalidateQueries({ queryKey: queryKeys.user.detail(userId) });',
    '```',
  ]);

  return decl;
}

/**
 * Generate the complete query-keys.ts file
 */
export function generateQueryKeysFile(
  options: QueryKeyGeneratorOptions,
): GeneratedQueryKeysFile {
  const { tables, customQueries, config } = options;
  const { relationships, generateScopedKeys } = config;

  const statements: t.Statement[] = [];

  // Generate scope types for entities with relationships
  if (generateScopedKeys && Object.keys(relationships).length > 0) {
    const generatedScopes = new Set<string>();
    for (const table of tables) {
      const { typeName } = getTableNames(table);
      const scopeTypeName = `${typeName}Scope`;
      if (!generatedScopes.has(scopeTypeName)) {
        const scopeType = generateScopeTypeDeclaration(typeName, relationships);
        if (scopeType) {
          statements.push(scopeType);
          generatedScopes.add(scopeTypeName);
        }
      }
    }
  }

  // Generate entity keys
  for (const table of tables) {
    statements.push(
      generateEntityKeysDeclaration(table, relationships, generateScopedKeys),
    );
  }

  // Generate custom query keys
  const queryOperations = customQueries.filter((op) => op.kind === 'query');
  const customKeysDecl = generateCustomQueryKeysDeclaration(queryOperations);
  if (customKeysDecl) {
    statements.push(customKeysDecl);
  }

  // Generate unified store
  statements.push(
    generateUnifiedStoreDeclaration(tables, queryOperations.length > 0),
  );

  // Generate QueryKeyScope type
  const scopeTypeDecl = t.exportNamedDeclaration(
    t.tsTypeAliasDeclaration(
      t.identifier('QueryKeyScope'),
      null,
      keyofTypeof('queryKeys'),
    ),
  );
  addJSDocComment(scopeTypeDecl, [
    'Type representing all available query key scopes',
  ]);
  statements.push(scopeTypeDecl);

  // Generate code from AST
  const code = generateCode(statements);

  // Build final content with header and section comments
  const header = getGeneratedFileHeader('Centralized query key factory');
  const description = `// ============================================================================
// This file provides a centralized, type-safe query key factory following
// the lukemorales query-key-factory pattern for React Query.
//
// Benefits:
// - Single source of truth for all query keys
// - Type-safe key access with autocomplete
// - Hierarchical invalidation (invalidate all 'user.*' queries)
// - Scoped keys for parent-child relationships
// ============================================================================`;

  let content = `${header}

${description}

`;

  // Add scope types section if present
  if (generateScopedKeys && Object.keys(relationships).length > 0) {
    const hasScopes = tables.some((table) => {
      const { typeName } = getTableNames(table);
      return !!relationships[typeName.toLowerCase()];
    });
    if (hasScopes) {
      content += `// ============================================================================
// Scope Types
// ============================================================================

`;
    }
  }

  // Insert section comments into the generated code
  const codeLines = code.split('\n');
  let inScopeTypes =
    generateScopedKeys && Object.keys(relationships).length > 0;
  let addedEntitySection = false;
  let addedCustomSection = false;
  let addedUnifiedSection = false;

  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i];

    // Detect transition from scope types to entity keys
    if (
      inScopeTypes &&
      line.startsWith('export const') &&
      line.includes('Keys =')
    ) {
      content += `// ============================================================================
// Entity Query Keys
// ============================================================================

`;
      inScopeTypes = false;
      addedEntitySection = true;
    }

    // Detect custom query keys section
    if (
      !addedCustomSection &&
      line.startsWith('export const customQueryKeys')
    ) {
      content += `
// ============================================================================
// Custom Query Keys
// ============================================================================

`;
      addedCustomSection = true;
    }

    // Detect unified store section
    if (!addedUnifiedSection && line.includes('* Unified query key store')) {
      content += `
// ============================================================================
// Unified Query Key Store
// ============================================================================

`;
      addedUnifiedSection = true;
    }

    content += line + '\n';
  }

  // If no scope types, add entity section at the beginning
  if (!addedEntitySection && !inScopeTypes) {
    const firstExportIndex = content.indexOf('\nexport const');
    if (firstExportIndex !== -1) {
      content =
        content.slice(0, firstExportIndex) +
        `
// ============================================================================
// Entity Query Keys
// ============================================================================
` +
        content.slice(firstExportIndex);
    }
  }

  return {
    fileName: 'query-keys.ts',
    content,
  };
}
