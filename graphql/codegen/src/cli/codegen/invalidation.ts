/**
 * Cache invalidation helpers generator
 *
 * Generates type-safe cache invalidation utilities with cascade support
 * for parent-child entity relationships.
 */
import type { CleanTable } from '../../types/schema';
import type { ResolvedQueryKeyConfig, EntityRelationship } from '../../types/config';
import { getTableNames, getGeneratedFileHeader, ucFirst, lcFirst } from './utils';

export interface InvalidationGeneratorOptions {
  tables: CleanTable[];
  config: ResolvedQueryKeyConfig;
}

export interface GeneratedInvalidationFile {
  fileName: string;
  content: string;
}

/**
 * Build a map of parent -> children for cascade invalidation
 */
function buildChildrenMap(
  relationships: Record<string, EntityRelationship>
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
  childrenMap: Map<string, string[]>
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
 * Generate cascade invalidation helper for a single entity
 */
function generateEntityCascadeHelper(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>,
  childrenMap: Map<string, string[]>,
  allTables: CleanTable[]
): string {
  const { typeName, singularName } = getTableNames(table);
  const entityKey = typeName.toLowerCase();

  const descendants = getAllDescendants(entityKey, childrenMap);
  const hasDescendants = descendants.length > 0;
  const relationship = relationships[entityKey];
  const hasParent = !!relationship;

  const lines: string[] = [];

  // Simple invalidate helper (just this entity)
  lines.push(`  /**`);
  lines.push(`   * Invalidate ${singularName} queries`);
  lines.push(`   */`);
  lines.push(`  ${singularName}: {`);

  // All queries for this entity
  lines.push(`    /** Invalidate all ${singularName} queries */`);
  lines.push(`    all: (queryClient: QueryClient) =>`);
  lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.all }),`);

  // List queries
  lines.push(``);
  lines.push(`    /** Invalidate ${singularName} list queries */`);
  if (hasParent) {
    const scopeTypeName = `${typeName}Scope`;
    lines.push(`    lists: (queryClient: QueryClient, scope?: ${scopeTypeName}) =>`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.lists(scope) }),`);
  } else {
    lines.push(`    lists: (queryClient: QueryClient) =>`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.lists() }),`);
  }

  // Specific item
  lines.push(``);
  lines.push(`    /** Invalidate a specific ${singularName} */`);
  if (hasParent) {
    const scopeTypeName = `${typeName}Scope`;
    lines.push(`    detail: (queryClient: QueryClient, id: string | number, scope?: ${scopeTypeName}) =>`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.detail(id, scope) }),`);
  } else {
    lines.push(`    detail: (queryClient: QueryClient, id: string | number) =>`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.detail(id) }),`);
  }

  // With children (cascade)
  if (hasDescendants) {
    lines.push(``);
    lines.push(`    /**`);
    lines.push(`     * Invalidate ${singularName} and all child entities`);
    lines.push(`     * Cascades to: ${descendants.join(', ')}`);
    lines.push(`     */`);
    lines.push(`    withChildren: (queryClient: QueryClient, id: string | number) => {`);

    // Invalidate the entity itself
    lines.push(`      // Invalidate this ${singularName}`);
    if (hasParent) {
      lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.detail(id) });`);
      lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.lists() });`);
    } else {
      lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.detail(id) });`);
      lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(typeName)}Keys.lists() });`);
    }

    // Invalidate each descendant using scoped keys
    lines.push(``);
    lines.push(`      // Cascade to child entities`);

    for (const descendant of descendants) {
      const descendantTable = allTables.find(
        (t) => getTableNames(t).typeName.toLowerCase() === descendant
      );
      if (descendantTable) {
        const { typeName: descTypeName } = getTableNames(descendantTable);
        const descRel = relationships[descendant];

        if (descRel) {
          // Find the foreign key that links to our entity
          // Could be direct parent or ancestor
          let fkField: string | null = null;
          if (descRel.parent.toLowerCase() === entityKey) {
            fkField = descRel.foreignKey;
          } else if (descRel.ancestors?.includes(typeName.toLowerCase())) {
            // It's an ancestor relationship
            fkField = `${lcFirst(typeName)}Id`;
          }

          if (fkField) {
            lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(descTypeName)}Keys.by${ucFirst(typeName)}(id) });`);
          } else {
            // Fallback to invalidating all of that entity type
            lines.push(`      queryClient.invalidateQueries({ queryKey: ${lcFirst(descTypeName)}Keys.all });`);
          }
        }
      }
    }

    lines.push(`    },`);
  }

  lines.push(`  },`);

  return lines.join('\n');
}

/**
 * Generate remove (for delete operations) helpers
 */
function generateRemoveHelpers(
  tables: CleanTable[],
  relationships: Record<string, EntityRelationship>
): string {
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * Remove queries from cache (for delete operations)`);
  lines.push(` *`);
  lines.push(` * Use these when an entity is deleted to remove it from cache`);
  lines.push(` * instead of just invalidating (which would trigger a refetch).`);
  lines.push(` */`);
  lines.push(`export const remove = {`);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const { typeName, singularName } = getTableNames(table);
    const relationship = relationships[typeName.toLowerCase()];

    lines.push(`  /** Remove ${singularName} from cache */`);
    if (relationship) {
      const scopeTypeName = `${typeName}Scope`;
      lines.push(`  ${singularName}: (queryClient: QueryClient, id: string | number, scope?: ${scopeTypeName}) => {`);
      lines.push(`    queryClient.removeQueries({ queryKey: ${lcFirst(typeName)}Keys.detail(id, scope) });`);
    } else {
      lines.push(`  ${singularName}: (queryClient: QueryClient, id: string | number) => {`);
      lines.push(`    queryClient.removeQueries({ queryKey: ${lcFirst(typeName)}Keys.detail(id) });`);
    }
    lines.push(`  },`);

    if (i < tables.length - 1) {
      lines.push(``);
    }
  }

  lines.push(`} as const;`);

  return lines.join('\n');
}

/**
 * Generate the complete invalidation.ts file
 */
export function generateInvalidationFile(
  options: InvalidationGeneratorOptions
): GeneratedInvalidationFile {
  const { tables, config } = options;
  const { relationships, generateCascadeHelpers } = config;

  const childrenMap = buildChildrenMap(relationships);

  const lines: string[] = [];

  // File header
  lines.push(getGeneratedFileHeader('Cache invalidation helpers'));
  lines.push(``);

  // Description
  lines.push(`// ============================================================================`);
  lines.push(`// Type-safe cache invalidation utilities`);
  lines.push(`//`);
  lines.push(`// Features:`);
  lines.push(`// - Simple invalidation helpers per entity`);
  lines.push(`// - Cascade invalidation for parent-child relationships`);
  lines.push(`// - Remove helpers for delete operations`);
  lines.push(`// ============================================================================`);
  lines.push(``);

  // Imports
  lines.push(`import type { QueryClient } from '@tanstack/react-query';`);

  // Import query keys
  const keyImports: string[] = [];
  for (const table of tables) {
    const { typeName } = getTableNames(table);
    keyImports.push(`${lcFirst(typeName)}Keys`);
  }
  lines.push(`import { ${keyImports.join(', ')} } from './query-keys';`);

  // Import scope types if needed
  const scopeTypes: string[] = [];
  for (const table of tables) {
    const { typeName } = getTableNames(table);
    if (relationships[typeName.toLowerCase()]) {
      scopeTypes.push(`${typeName}Scope`);
    }
  }
  if (scopeTypes.length > 0) {
    lines.push(`import type { ${scopeTypes.join(', ')} } from './query-keys';`);
  }

  lines.push(``);

  // Generate invalidate helpers
  lines.push(`// ============================================================================`);
  lines.push(`// Invalidation Helpers`);
  lines.push(`// ============================================================================`);
  lines.push(``);

  lines.push(`/**`);
  lines.push(` * Type-safe query invalidation helpers`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`ts`);
  lines.push(` * // Invalidate all user queries`);
  lines.push(` * invalidate.user.all(queryClient);`);
  lines.push(` *`);
  lines.push(` * // Invalidate user lists`);
  lines.push(` * invalidate.user.lists(queryClient);`);
  lines.push(` *`);
  lines.push(` * // Invalidate specific user`);
  lines.push(` * invalidate.user.detail(queryClient, userId);`);

  // Add cascade example if relationships exist
  if (generateCascadeHelpers && Object.keys(relationships).length > 0) {
    lines.push(` *`);
    lines.push(` * // Cascade invalidate (entity + all children)`);
    lines.push(` * invalidate.database.withChildren(queryClient, databaseId);`);
  }

  lines.push(` * \`\`\``);
  lines.push(` */`);
  lines.push(`export const invalidate = {`);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    lines.push(
      generateEntityCascadeHelper(table, relationships, childrenMap, tables)
    );
    if (i < tables.length - 1) {
      lines.push(``);
    }
  }

  lines.push(`} as const;`);

  // Generate remove helpers
  lines.push(``);
  lines.push(`// ============================================================================`);
  lines.push(`// Remove Helpers (for delete operations)`);
  lines.push(`// ============================================================================`);
  lines.push(``);

  lines.push(generateRemoveHelpers(tables, relationships));

  lines.push(``);

  return {
    fileName: 'invalidation.ts',
    content: lines.join('\n'),
  };
}
