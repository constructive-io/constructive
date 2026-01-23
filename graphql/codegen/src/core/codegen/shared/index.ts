/**
 * Shared types generator
 *
 * Generates shared TypeScript types that can be imported by both
 * React Query SDK and ORM client outputs.
 *
 * Output structure:
 * shared/
 *   index.ts          - Barrel export
 *   types.ts          - Entity interfaces
 *   schema-types.ts   - Enums, input types, payload types
 *   filters.ts        - Filter types (StringFilter, IntFilter, etc.)
 */
import type { CleanTable, CleanOperation, TypeRegistry } from '../../../types/schema';
import type { ResolvedConfig } from '../../../types/config';
import { generateTypesFile } from '../types';
import { generateSchemaTypesFile } from '../schema-types-generator';
import { getTableNames } from '../utils';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateSharedOptions {
  tables: CleanTable[];
  customOperations?: {
    queries: CleanOperation[];
    mutations: CleanOperation[];
    typeRegistry: TypeRegistry;
  };
  config: ResolvedConfig;
}

export interface GenerateSharedResult {
  files: GeneratedFile[];
  generatedEnumNames: string[];
  hasSchemaTypes: boolean;
}

/**
 * Generate shared types that can be imported by both React Query SDK and ORM client
 */
export function generateSharedTypes(options: GenerateSharedOptions): GenerateSharedResult {
  const { tables, customOperations } = options;
  const files: GeneratedFile[] = [];

  // Collect table type names for import path resolution
  const tableTypeNames = new Set(tables.map((t) => getTableNames(t).typeName));

  // 1. Generate schema-types.ts for custom operations (if any)
  // NOTE: This must come BEFORE types.ts so that types.ts can import enum types
  let hasSchemaTypes = false;
  let generatedEnumNames: string[] = [];
  if (customOperations && customOperations.typeRegistry) {
    const schemaTypesResult = generateSchemaTypesFile({
      typeRegistry: customOperations.typeRegistry,
      tableTypeNames,
    });

    // Only include if there's meaningful content
    if (schemaTypesResult.content.split('\n').length > 10) {
      files.push({
        path: 'schema-types.ts',
        content: schemaTypesResult.content,
      });
      hasSchemaTypes = true;
      generatedEnumNames = schemaTypesResult.generatedEnums || [];
    }
  }

  // 2. Generate types.ts (entity interfaces and filter types)
  files.push({
    path: 'types.ts',
    content: generateTypesFile(tables, {
      enumsFromSchemaTypes: generatedEnumNames,
    }),
  });

  // 3. Generate barrel export (index.ts)
  const barrelContent = generateSharedBarrel(hasSchemaTypes);
  files.push({
    path: 'index.ts',
    content: barrelContent,
  });

  return {
    files,
    generatedEnumNames,
    hasSchemaTypes,
  };
}

/**
 * Generate the barrel export for shared types
 */
function generateSharedBarrel(hasSchemaTypes: boolean): string {
  const lines = [
    '/**',
    ' * Shared types - auto-generated, do not edit',
    ' */',
    '',
    "export * from './types';",
  ];

  if (hasSchemaTypes) {
    lines.push("export * from './schema-types';");
  }

  lines.push('');
  return lines.join('\n');
}

export { generateTypesFile } from '../types';
export { generateSchemaTypesFile } from '../schema-types-generator';
