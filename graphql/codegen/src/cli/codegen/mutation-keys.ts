/**
 * Mutation key factory generator
 *
 * Generates centralized mutation keys for tracking in-flight mutations.
 * Useful for:
 * - Optimistic updates with rollback
 * - Mutation deduplication
 * - Tracking mutation state with useIsMutating
 */
import type { CleanTable, CleanOperation } from '../../types/schema';
import type { ResolvedQueryKeyConfig, EntityRelationship } from '../../types/config';
import { getTableNames, getGeneratedFileHeader, lcFirst } from './utils';

export interface MutationKeyGeneratorOptions {
  tables: CleanTable[];
  customMutations: CleanOperation[];
  config: ResolvedQueryKeyConfig;
}

export interface GeneratedMutationKeysFile {
  fileName: string;
  content: string;
}

/**
 * Generate mutation keys for a single table entity
 */
function generateEntityMutationKeys(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>
): string {
  const { typeName, singularName } = getTableNames(table);
  const entityKey = typeName.toLowerCase();
  const keysName = `${lcFirst(typeName)}MutationKeys`;

  const relationship = relationships[entityKey];

  const lines: string[] = [];

  lines.push(`export const ${keysName} = {`);
  lines.push(`  /** All ${singularName} mutation keys */`);
  lines.push(`  all: ['mutation', '${entityKey}'] as const,`);

  // Create mutation
  lines.push(``);
  lines.push(`  /** Create ${singularName} mutation key */`);
  if (relationship) {
    // Include optional parent scope for tracking creates within a parent context
    lines.push(`  create: (${relationship.foreignKey}?: string) =>`);
    lines.push(`    ${relationship.foreignKey}`);
    lines.push(`      ? ['mutation', '${entityKey}', 'create', { ${relationship.foreignKey} }] as const`);
    lines.push(`      : ['mutation', '${entityKey}', 'create'] as const,`);
  } else {
    lines.push(`  create: () => ['mutation', '${entityKey}', 'create'] as const,`);
  }

  // Update mutation
  lines.push(``);
  lines.push(`  /** Update ${singularName} mutation key */`);
  lines.push(`  update: (id: string | number) =>`);
  lines.push(`    ['mutation', '${entityKey}', 'update', id] as const,`);

  // Delete mutation
  lines.push(``);
  lines.push(`  /** Delete ${singularName} mutation key */`);
  lines.push(`  delete: (id: string | number) =>`);
  lines.push(`    ['mutation', '${entityKey}', 'delete', id] as const,`);

  lines.push(`} as const;`);

  return lines.join('\n');
}

/**
 * Generate mutation keys for custom mutations
 */
function generateCustomMutationKeys(operations: CleanOperation[]): string {
  if (operations.length === 0) return '';

  const lines: string[] = [];
  lines.push(`export const customMutationKeys = {`);

  for (const op of operations) {
    const hasArgs = op.args.length > 0;

    lines.push(`  /** Mutation key for ${op.name} */`);
    if (hasArgs) {
      // For mutations with args, include a way to identify the specific mutation
      lines.push(`  ${op.name}: (identifier?: string) =>`);
      lines.push(`    identifier`);
      lines.push(`      ? ['mutation', '${op.name}', identifier] as const`);
      lines.push(`      : ['mutation', '${op.name}'] as const,`);
    } else {
      lines.push(`  ${op.name}: () => ['mutation', '${op.name}'] as const,`);
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
 * Generate the unified mutation keys store object
 */
function generateUnifiedMutationStore(
  tables: CleanTable[],
  hasCustomMutations: boolean
): string {
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * Unified mutation key store`);
  lines.push(` *`);
  lines.push(` * Use this for tracking in-flight mutations with useIsMutating.`);
  lines.push(` *`);
  lines.push(` * @example`);
  lines.push(` * \`\`\`ts`);
  lines.push(` * import { useIsMutating } from '@tanstack/react-query';`);
  lines.push(` * import { mutationKeys } from './generated';`);
  lines.push(` *`);
  lines.push(` * // Check if any user mutations are in progress`);
  lines.push(` * const isMutatingUser = useIsMutating({ mutationKey: mutationKeys.user.all });`);
  lines.push(` *`);
  lines.push(` * // Check if a specific user is being updated`);
  lines.push(` * const isUpdating = useIsMutating({ mutationKey: mutationKeys.user.update(userId) });`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  lines.push(`export const mutationKeys = {`);

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const keysName = `${lcFirst(typeName)}MutationKeys`;
    lines.push(`  ${lcFirst(typeName)}: ${keysName},`);
  }

  if (hasCustomMutations) {
    lines.push(`  custom: customMutationKeys,`);
  }

  lines.push(`} as const;`);

  return lines.join('\n');
}

/**
 * Generate the complete mutation-keys.ts file
 */
export function generateMutationKeysFile(
  options: MutationKeyGeneratorOptions
): GeneratedMutationKeysFile {
  const { tables, customMutations, config } = options;
  const { relationships } = config;

  const lines: string[] = [];

  // File header
  lines.push(getGeneratedFileHeader('Centralized mutation key factory'));
  lines.push(``);

  // Description comments
  lines.push(`// ============================================================================`);
  lines.push(`// Mutation keys for tracking in-flight mutations`);
  lines.push(`//`);
  lines.push(`// Benefits:`);
  lines.push(`// - Track mutation state with useIsMutating`);
  lines.push(`// - Implement optimistic updates with proper rollback`);
  lines.push(`// - Deduplicate identical mutations`);
  lines.push(`// - Coordinate related mutations`);
  lines.push(`// ============================================================================`);
  lines.push(``);

  // Generate entity mutation keys
  lines.push(`// ============================================================================`);
  lines.push(`// Entity Mutation Keys`);
  lines.push(`// ============================================================================`);
  lines.push(``);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    lines.push(generateEntityMutationKeys(table, relationships));
    if (i < tables.length - 1) {
      lines.push(``);
    }
  }

  // Generate custom mutation keys
  const mutationOperations = customMutations.filter((op) => op.kind === 'mutation');
  if (mutationOperations.length > 0) {
    lines.push(``);
    lines.push(`// ============================================================================`);
    lines.push(`// Custom Mutation Keys`);
    lines.push(`// ============================================================================`);
    lines.push(``);
    lines.push(generateCustomMutationKeys(mutationOperations));
  }

  // Generate unified store
  lines.push(``);
  lines.push(`// ============================================================================`);
  lines.push(`// Unified Mutation Key Store`);
  lines.push(`// ============================================================================`);
  lines.push(``);
  lines.push(generateUnifiedMutationStore(tables, mutationOperations.length > 0));

  lines.push(``);

  return {
    fileName: 'mutation-keys.ts',
    content: lines.join('\n'),
  };
}
