/**
 * Query key factory generator
 *
 * Generates centralized query keys following the lukemorales query-key-factory pattern.
 * Supports hierarchical scoped keys for parent-child entity relationships.
 *
 * @see https://tanstack.com/query/docs/framework/react/community/lukemorales-query-key-factory
 */
import type { CleanTable, CleanOperation } from '../../types/schema';
import type { ResolvedQueryKeyConfig, EntityRelationship } from '../../types/config';
import { getTableNames, getGeneratedFileHeader, ucFirst, lcFirst } from './utils';

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

  // Use explicit ancestors if defined, otherwise traverse parent chain
  if (relationship.ancestors && relationship.ancestors.length > 0) {
    return relationship.ancestors;
  }

  // Build ancestor chain by following parent relationships
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
 * Generate scope type for an entity
 */
function generateScopeType(
  entityName: string,
  relationships: Record<string, EntityRelationship>
): { typeName: string; typeDefinition: string } | null {
  const relationship = relationships[entityName.toLowerCase()];
  if (!relationship) return null;

  const ancestors = getAncestors(entityName, relationships);
  const allParents = [relationship.parent, ...ancestors];

  const typeName = `${ucFirst(entityName)}Scope`;
  const fields = allParents.map((parent) => {
    const rel = relationships[entityName.toLowerCase()];
    // Find the foreign key for this parent
    let fkField = `${lcFirst(parent)}Id`;
    if (rel && rel.parent === parent) {
      fkField = rel.foreignKey;
    } else {
      // Check if any ancestor has a direct relationship
      const directRel = Object.entries(relationships).find(
        ([, r]) => r.parent === parent
      );
      if (directRel) {
        fkField = directRel[1].foreignKey;
      }
    }
    return `${fkField}?: string`;
  });

  const typeDefinition = `export type ${typeName} = { ${fields.join('; ')} };`;
  return { typeName, typeDefinition };
}

/**
 * Generate query keys for a single table entity
 */
function generateEntityKeys(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>,
  generateScopedKeys: boolean
): string {
  const { typeName, singularName } = getTableNames(table);
  const entityKey = typeName.toLowerCase();
  const keysName = `${lcFirst(typeName)}Keys`;

  const relationship = relationships[entityKey];
  const hasRelationship = !!relationship && generateScopedKeys;

  const lines: string[] = [];

  lines.push(`export const ${keysName} = {`);
  lines.push(`  /** All ${singularName} queries */`);
  lines.push(`  all: ['${entityKey}'] as const,`);

  if (hasRelationship) {
    // Generate scope factories for parent relationships
    const ancestors = getAncestors(typeName, relationships);
    const allParents = [relationship.parent, ...ancestors];

    // Add scope factories for each parent level
    for (const parent of allParents) {
      const parentUpper = ucFirst(parent);
      const parentLower = lcFirst(parent);
      let fkField = `${parentLower}Id`;

      // Try to find the correct foreign key
      if (relationship.parent === parent) {
        fkField = relationship.foreignKey;
      }

      lines.push(``);
      lines.push(`  /** ${typeName} queries scoped to a specific ${parentLower} */`);
      lines.push(`  by${parentUpper}: (${fkField}: string) =>`);
      lines.push(`    ['${entityKey}', { ${fkField} }] as const,`);
    }

    // Scoped helper function
    const scopeTypeName = `${typeName}Scope`;
    lines.push(``);
    lines.push(`  /** Get scope-aware base key */`);
    lines.push(`  scoped: (scope?: ${scopeTypeName}) => {`);

    // Generate scope resolution logic (most specific first)
    const scopeChecks: string[] = [];
    if (relationship.parent) {
      scopeChecks.push(
        `    if (scope?.${relationship.foreignKey}) return ${keysName}.by${ucFirst(relationship.parent)}(scope.${relationship.foreignKey});`
      );
    }
    for (const ancestor of ancestors) {
      const ancestorLower = lcFirst(ancestor);
      const fkField = `${ancestorLower}Id`;
      scopeChecks.push(
        `    if (scope?.${fkField}) return ${keysName}.by${ucFirst(ancestor)}(scope.${fkField});`
      );
    }

    lines.push(...scopeChecks);
    lines.push(`    return ${keysName}.all;`);
    lines.push(`  },`);

    // Lists with scope
    lines.push(``);
    lines.push(`  /** List query keys (optionally scoped) */`);
    lines.push(`  lists: (scope?: ${scopeTypeName}) =>`);
    lines.push(`    [...${keysName}.scoped(scope), 'list'] as const,`);

    lines.push(``);
    lines.push(`  /** List query key with variables */`);
    lines.push(`  list: (variables?: object, scope?: ${scopeTypeName}) =>`);
    lines.push(`    [...${keysName}.lists(scope), variables] as const,`);

    // Details with scope
    lines.push(``);
    lines.push(`  /** Detail query keys (optionally scoped) */`);
    lines.push(`  details: (scope?: ${scopeTypeName}) =>`);
    lines.push(`    [...${keysName}.scoped(scope), 'detail'] as const,`);

    lines.push(``);
    lines.push(`  /** Detail query key for specific item */`);
    lines.push(`  detail: (id: string | number, scope?: ${scopeTypeName}) =>`);
    lines.push(`    [...${keysName}.details(scope), id] as const,`);
  } else {
    // Simple non-scoped keys
    lines.push(``);
    lines.push(`  /** List query keys */`);
    lines.push(`  lists: () => [...${keysName}.all, 'list'] as const,`);

    lines.push(``);
    lines.push(`  /** List query key with variables */`);
    lines.push(`  list: (variables?: object) =>`);
    lines.push(`    [...${keysName}.lists(), variables] as const,`);

    lines.push(``);
    lines.push(`  /** Detail query keys */`);
    lines.push(`  details: () => [...${keysName}.all, 'detail'] as const,`);

    lines.push(``);
    lines.push(`  /** Detail query key for specific item */`);
    lines.push(`  detail: (id: string | number) =>`);
    lines.push(`    [...${keysName}.details(), id] as const,`);
  }

  lines.push(`} as const;`);

  return lines.join('\n');
}

/**
 * Generate query keys for custom operations (non-table queries)
 */
function generateCustomQueryKeys(operations: CleanOperation[]): string {
  if (operations.length === 0) return '';

  const lines: string[] = [];
  lines.push(`export const customQueryKeys = {`);

  for (const op of operations) {
    const hasArgs = op.args.length > 0;
    const hasRequiredArgs = op.args.some(
      (arg) => arg.type.kind === 'NON_NULL'
    );

    if (hasArgs) {
      const argsType = hasRequiredArgs ? 'object' : 'object | undefined';
      lines.push(`  /** Query key for ${op.name} */`);
      lines.push(`  ${op.name}: (variables${hasRequiredArgs ? '' : '?'}: ${argsType}) =>`);
      lines.push(`    ['${op.name}', variables] as const,`);
    } else {
      lines.push(`  /** Query key for ${op.name} */`);
      lines.push(`  ${op.name}: () => ['${op.name}'] as const,`);
    }
    lines.push(``);
  }

  // Remove trailing empty line
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  lines.push(`} as const;`);

  return lines.join('\n');
}

/**
 * Generate the unified query keys store object
 */
function generateUnifiedStore(
  tables: CleanTable[],
  hasCustomQueries: boolean
): string {
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * Unified query key store`);
  lines.push(` *`);
  lines.push(` * Use this for type-safe query key access across your application.`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`ts`);
  lines.push(` * // Invalidate all user queries`);
  lines.push(` * queryClient.invalidateQueries({ queryKey: queryKeys.user.all });`);
  lines.push(` *`);
  lines.push(` * // Invalidate user list queries`);
  lines.push(` * queryClient.invalidateQueries({ queryKey: queryKeys.user.lists() });`);
  lines.push(` *`);
  lines.push(` * // Invalidate specific user`);
  lines.push(` * queryClient.invalidateQueries({ queryKey: queryKeys.user.detail(userId) });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  lines.push(`export const queryKeys = {`);

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const keysName = `${lcFirst(typeName)}Keys`;
    lines.push(`  ${lcFirst(typeName)}: ${keysName},`);
  }

  if (hasCustomQueries) {
    lines.push(`  custom: customQueryKeys,`);
  }

  lines.push(`} as const;`);

  return lines.join('\n');
}

/**
 * Generate the complete query-keys.ts file
 */
export function generateQueryKeysFile(
  options: QueryKeyGeneratorOptions
): GeneratedQueryKeysFile {
  const { tables, customQueries, config } = options;
  const { relationships, generateScopedKeys } = config;

  const lines: string[] = [];

  // File header
  lines.push(getGeneratedFileHeader('Centralized query key factory'));
  lines.push(``);

  // Imports
  lines.push(`// ============================================================================`);
  lines.push(`// This file provides a centralized, type-safe query key factory following`);
  lines.push(`// the lukemorales query-key-factory pattern for React Query.`);
  lines.push(`//`);
  lines.push(`// Benefits:`);
  lines.push(`// - Single source of truth for all query keys`);
  lines.push(`// - Type-safe key access with autocomplete`);
  lines.push(`// - Hierarchical invalidation (invalidate all 'user.*' queries)`);
  lines.push(`// - Scoped keys for parent-child relationships`);
  lines.push(`// ============================================================================`);
  lines.push(``);

  // Generate scope types for entities with relationships
  if (generateScopedKeys && Object.keys(relationships).length > 0) {
    lines.push(`// ============================================================================`);
    lines.push(`// Scope Types`);
    lines.push(`// ============================================================================`);
    lines.push(``);

    const generatedScopes = new Set<string>();
    for (const table of tables) {
      const { typeName } = getTableNames(table);
      const scopeType = generateScopeType(typeName, relationships);
      if (scopeType && !generatedScopes.has(scopeType.typeName)) {
        lines.push(scopeType.typeDefinition);
        generatedScopes.add(scopeType.typeName);
      }
    }

    if (generatedScopes.size > 0) {
      lines.push(``);
    }
  }

  // Generate entity keys
  lines.push(`// ============================================================================`);
  lines.push(`// Entity Query Keys`);
  lines.push(`// ============================================================================`);
  lines.push(``);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    lines.push(generateEntityKeys(table, relationships, generateScopedKeys));
    if (i < tables.length - 1) {
      lines.push(``);
    }
  }

  // Generate custom query keys
  const queryOperations = customQueries.filter((op) => op.kind === 'query');
  if (queryOperations.length > 0) {
    lines.push(``);
    lines.push(`// ============================================================================`);
    lines.push(`// Custom Query Keys`);
    lines.push(`// ============================================================================`);
    lines.push(``);
    lines.push(generateCustomQueryKeys(queryOperations));
  }

  // Generate unified store
  lines.push(``);
  lines.push(`// ============================================================================`);
  lines.push(`// Unified Query Key Store`);
  lines.push(`// ============================================================================`);
  lines.push(``);
  lines.push(generateUnifiedStore(tables, queryOperations.length > 0));

  // Export type for query key scope
  lines.push(``);
  lines.push(`/** Type representing all available query key scopes */`);
  lines.push(`export type QueryKeyScope = keyof typeof queryKeys;`);

  lines.push(``);

  return {
    fileName: 'query-keys.ts',
    content: lines.join('\n'),
  };
}
