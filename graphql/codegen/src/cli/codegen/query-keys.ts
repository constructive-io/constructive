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

import type { CleanTable, CleanOperation } from '../../types/schema';
import type { ResolvedQueryKeyConfig, EntityRelationship } from '../../types/config';
import { getTableNames, getGeneratedFileHeader, ucFirst, lcFirst } from './utils';
import {
  generateCode,
  addJSDocComment,
  asConst,
  constArray,
  spread,
  member,
  call,
  typedParam,
  stringOrNumberType,
  objectType,
  typeRef,
  arrow,
  objectProp,
  exportConst,
  exportType,
  ifStmt,
  returnStmt,
  block,
  keyofTypeof,
} from './babel-ast';

export interface QueryKeyGeneratorOptions {
  tables: CleanTable[];
  customQueries: CleanOperation[];
  config: ResolvedQueryKeyConfig;
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
  relationships: Record<string, EntityRelationship>
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
  relationships: Record<string, EntityRelationship>
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
        ([, r]) => r.parent === parent
      );
      if (directRel) {
        fkField = directRel[1].foreignKey;
      }
    }

    const signature = t.tsPropertySignature(
      t.identifier(fkField),
      t.tsTypeAnnotation(t.tsStringKeyword())
    );
    signature.optional = true;
    members.push(signature);
  }

  return exportType(typeName, t.tsTypeLiteral(members));
}

/**
 * Build the 'all' property: all: ['entityKey'] as const
 */
function buildAllProperty(entityKey: string, singularName: string): t.ObjectProperty {
  const prop = objectProp(
    'all',
    constArray([t.stringLiteral(entityKey)])
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
  fkField: string
): t.ObjectProperty {
  const parentUpper = ucFirst(parent);
  const parentLower = lcFirst(parent);

  const prop = objectProp(
    `by${parentUpper}`,
    arrow(
      [typedParam(fkField, t.tsStringKeyword())],
      constArray([
        t.stringLiteral(entityKey),
        t.objectExpression([
          t.objectProperty(t.identifier(fkField), t.identifier(fkField), false, true)
        ])
      ])
    )
  );
  addJSDocComment(prop, [`${typeName} queries scoped to a specific ${parentLower}`]);
  return prop;
}

/**
 * Build the scoped helper function property
 */
function buildScopedProperty(
  keysName: string,
  typeName: string,
  relationship: EntityRelationship,
  ancestors: string[]
): t.ObjectProperty {
  const scopeTypeName = `${typeName}Scope`;
  const scopeParam = typedParam('scope', typeRef(scopeTypeName), true);

  const statements: t.Statement[] = [];

  if (relationship.parent) {
    statements.push(
      ifStmt(
        t.optionalMemberExpression(
          t.identifier('scope'),
          t.identifier(relationship.foreignKey),
          false,
          true
        ),
        returnStmt(
          call(
            member(keysName, `by${ucFirst(relationship.parent)}`),
            [member('scope', relationship.foreignKey)]
          )
        )
      )
    );
  }

  for (const ancestor of ancestors) {
    const ancestorLower = lcFirst(ancestor);
    const fkField = `${ancestorLower}Id`;
    statements.push(
      ifStmt(
        t.optionalMemberExpression(
          t.identifier('scope'),
          t.identifier(fkField),
          false,
          true
        ),
        returnStmt(
          call(
            member(keysName, `by${ucFirst(ancestor)}`),
            [member('scope', fkField)]
          )
        )
      )
    );
  }

  statements.push(returnStmt(member(keysName, 'all')));

  const prop = objectProp(
    'scoped',
    arrow([scopeParam], block(statements))
  );
  addJSDocComment(prop, ['Get scope-aware base key']);
  return prop;
}

/**
 * Build lists property (scoped version)
 */
function buildScopedListsProperty(keysName: string, scopeTypeName: string): t.ObjectProperty {
  const scopeParam = typedParam('scope', typeRef(scopeTypeName), true);

  const prop = objectProp(
    'lists',
    arrow(
      [scopeParam],
      constArray([
        spread(call(member(keysName, 'scoped'), [t.identifier('scope')])),
        t.stringLiteral('list')
      ])
    )
  );
  addJSDocComment(prop, ['List query keys (optionally scoped)']);
  return prop;
}

/**
 * Build list property (scoped version)
 */
function buildScopedListProperty(keysName: string, scopeTypeName: string): t.ObjectProperty {
  const variablesParam = typedParam('variables', objectType(), true);
  const scopeParam = typedParam('scope', typeRef(scopeTypeName), true);

  const prop = objectProp(
    'list',
    arrow(
      [variablesParam, scopeParam],
      constArray([
        spread(call(member(keysName, 'lists'), [t.identifier('scope')])),
        t.identifier('variables')
      ])
    )
  );
  addJSDocComment(prop, ['List query key with variables']);
  return prop;
}

/**
 * Build details property (scoped version)
 */
function buildScopedDetailsProperty(keysName: string, scopeTypeName: string): t.ObjectProperty {
  const scopeParam = typedParam('scope', typeRef(scopeTypeName), true);

  const prop = objectProp(
    'details',
    arrow(
      [scopeParam],
      constArray([
        spread(call(member(keysName, 'scoped'), [t.identifier('scope')])),
        t.stringLiteral('detail')
      ])
    )
  );
  addJSDocComment(prop, ['Detail query keys (optionally scoped)']);
  return prop;
}

/**
 * Build detail property (scoped version)
 */
function buildScopedDetailProperty(keysName: string, scopeTypeName: string): t.ObjectProperty {
  const idParam = typedParam('id', stringOrNumberType());
  const scopeParam = typedParam('scope', typeRef(scopeTypeName), true);

  const prop = objectProp(
    'detail',
    arrow(
      [idParam, scopeParam],
      constArray([
        spread(call(member(keysName, 'details'), [t.identifier('scope')])),
        t.identifier('id')
      ])
    )
  );
  addJSDocComment(prop, ['Detail query key for specific item']);
  return prop;
}

/**
 * Build simple (non-scoped) lists property
 */
function buildSimpleListsProperty(keysName: string): t.ObjectProperty {
  const prop = objectProp(
    'lists',
    arrow(
      [],
      constArray([
        spread(member(keysName, 'all')),
        t.stringLiteral('list')
      ])
    )
  );
  addJSDocComment(prop, ['List query keys']);
  return prop;
}

/**
 * Build simple (non-scoped) list property
 */
function buildSimpleListProperty(keysName: string): t.ObjectProperty {
  const variablesParam = typedParam('variables', objectType(), true);

  const prop = objectProp(
    'list',
    arrow(
      [variablesParam],
      constArray([
        spread(call(member(keysName, 'lists'), [])),
        t.identifier('variables')
      ])
    )
  );
  addJSDocComment(prop, ['List query key with variables']);
  return prop;
}

/**
 * Build simple (non-scoped) details property
 */
function buildSimpleDetailsProperty(keysName: string): t.ObjectProperty {
  const prop = objectProp(
    'details',
    arrow(
      [],
      constArray([
        spread(member(keysName, 'all')),
        t.stringLiteral('detail')
      ])
    )
  );
  addJSDocComment(prop, ['Detail query keys']);
  return prop;
}

/**
 * Build simple (non-scoped) detail property
 */
function buildSimpleDetailProperty(keysName: string): t.ObjectProperty {
  const idParam = typedParam('id', stringOrNumberType());

  const prop = objectProp(
    'detail',
    arrow(
      [idParam],
      constArray([
        spread(call(member(keysName, 'details'), [])),
        t.identifier('id')
      ])
    )
  );
  addJSDocComment(prop, ['Detail query key for specific item']);
  return prop;
}

/**
 * Generate query keys declaration for a single table entity
 */
function generateEntityKeysDeclaration(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>,
  generateScopedKeys: boolean
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
      properties.push(buildByParentProperty(entityKey, typeName, parent, fkField));
    }

    properties.push(buildScopedProperty(keysName, typeName, relationship, ancestors));

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

  return exportConst(keysName, asConst(t.objectExpression(properties)));
}

/**
 * Generate query keys declaration for custom operations
 */
function generateCustomQueryKeysDeclaration(
  operations: CleanOperation[]
): t.ExportNamedDeclaration | null {
  if (operations.length === 0) return null;

  const properties: t.ObjectProperty[] = [];

  for (const op of operations) {
    const hasArgs = op.args.length > 0;
    const hasRequiredArgs = op.args.some(
      (arg) => arg.type.kind === 'NON_NULL'
    );

    let prop: t.ObjectProperty;

    if (hasArgs) {
      const variablesParam = typedParam('variables', objectType(), !hasRequiredArgs);

      prop = objectProp(
        op.name,
        arrow(
          [variablesParam],
          constArray([t.stringLiteral(op.name), t.identifier('variables')])
        )
      );
    } else {
      prop = objectProp(
        op.name,
        arrow([], constArray([t.stringLiteral(op.name)]))
      );
    }

    addJSDocComment(prop, [`Query key for ${op.name}`]);
    properties.push(prop);
  }

  return exportConst('customQueryKeys', asConst(t.objectExpression(properties)));
}

/**
 * Generate the unified query keys store declaration
 */
function generateUnifiedStoreDeclaration(
  tables: CleanTable[],
  hasCustomQueries: boolean
): t.ExportNamedDeclaration {
  const properties: t.ObjectProperty[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const keysName = `${lcFirst(typeName)}Keys`;
    properties.push(
      t.objectProperty(t.identifier(lcFirst(typeName)), t.identifier(keysName))
    );
  }

  if (hasCustomQueries) {
    properties.push(
      t.objectProperty(t.identifier('custom'), t.identifier('customQueryKeys'))
    );
  }

  const decl = exportConst('queryKeys', asConst(t.objectExpression(properties)));

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
  options: QueryKeyGeneratorOptions
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
    statements.push(generateEntityKeysDeclaration(table, relationships, generateScopedKeys));
  }

  // Generate custom query keys
  const queryOperations = customQueries.filter((op) => op.kind === 'query');
  const customKeysDecl = generateCustomQueryKeysDeclaration(queryOperations);
  if (customKeysDecl) {
    statements.push(customKeysDecl);
  }

  // Generate unified store
  statements.push(generateUnifiedStoreDeclaration(tables, queryOperations.length > 0));

  // Generate QueryKeyScope type
  const scopeTypeDecl = exportType('QueryKeyScope', keyofTypeof('queryKeys'));
  addJSDocComment(scopeTypeDecl, ['Type representing all available query key scopes']);
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
    const hasScopes = tables.some(table => {
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
  let inScopeTypes = generateScopedKeys && Object.keys(relationships).length > 0;
  let addedEntitySection = false;
  let addedCustomSection = false;
  let addedUnifiedSection = false;

  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i];

    // Detect transition from scope types to entity keys
    if (inScopeTypes && line.startsWith('export const') && line.includes('Keys =')) {
      content += `// ============================================================================
// Entity Query Keys
// ============================================================================

`;
      inScopeTypes = false;
      addedEntitySection = true;
    }

    // Detect custom query keys section
    if (!addedCustomSection && line.startsWith('export const customQueryKeys')) {
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
      content = content.slice(0, firstExportIndex) + `
// ============================================================================
// Entity Query Keys
// ============================================================================
` + content.slice(firstExportIndex);
    }
  }

  return {
    fileName: 'query-keys.ts',
    content,
  };
}
