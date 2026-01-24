/**
 * ORM Generator Orchestrator
 *
 * Main entry point for ORM code generation. Coordinates all generators
 * and produces the complete ORM client output.
 */
import type { CleanTable, CleanOperation, TypeRegistry } from '../../../types/schema';
import type { GraphQLSDKConfigTarget } from '../../../types/config';
import {
  generateOrmClientFile,
  generateQueryBuilderFile,
  generateSelectTypesFile,
  generateCreateClientFile,
} from './client-generator';
import { generateAllModelFiles } from './model-generator';
import {
  generateCustomQueryOpsFile,
  generateCustomMutationOpsFile,
} from './custom-ops-generator';
import { generateModelsBarrel, generateTypesBarrel } from './barrel';
import { generateInputTypesFile, collectInputTypeNames, collectPayloadTypeNames } from './input-types-generator';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateOrmOptions {
  tables: CleanTable[];
  customOperations?: {
    queries: CleanOperation[];
    mutations: CleanOperation[];
    typeRegistry?: TypeRegistry;
  };
  config: GraphQLSDKConfigTarget;
  /**
   * Path to shared types directory (relative import path).
   * When provided, entity types are imported from shared types
   * instead of being generated in input-types.ts.
   * Example: '..' means types are in parent directory
   */
  sharedTypesPath?: string;
}

export interface GenerateOrmResult {
  files: GeneratedFile[];
  stats: {
    tables: number;
    customQueries: number;
    customMutations: number;
    totalFiles: number;
  };
}

/**
 * Generate all ORM client files
 */
export function generateOrm(options: GenerateOrmOptions): GenerateOrmResult {
  const { tables, customOperations, sharedTypesPath } = options;
  const files: GeneratedFile[] = [];

  // Use shared types when a sharedTypesPath is provided (unified output mode)
  const useSharedTypes = !!sharedTypesPath;
  const hasCustomQueries = (customOperations?.queries.length ?? 0) > 0;
  const hasCustomMutations = (customOperations?.mutations.length ?? 0) > 0;
  const typeRegistry = customOperations?.typeRegistry;

  // 1. Generate runtime files (client, query-builder, select-types)
  const clientFile = generateOrmClientFile();
  files.push({ path: clientFile.fileName, content: clientFile.content });

  const queryBuilderFile = generateQueryBuilderFile();
  files.push({ path: queryBuilderFile.fileName, content: queryBuilderFile.content });

  const selectTypesFile = generateSelectTypesFile();
  files.push({ path: selectTypesFile.fileName, content: selectTypesFile.content });

  // 2. Generate model files
  const modelFiles = generateAllModelFiles(tables, useSharedTypes);
  for (const modelFile of modelFiles) {
    files.push({
      path: `models/${modelFile.fileName}`,
      content: modelFile.content,
    });
  }

  // 3. Generate models barrel
  const modelsBarrel = generateModelsBarrel(tables);
  files.push({ path: modelsBarrel.fileName, content: modelsBarrel.content });

  // 4. Generate comprehensive input types (entities, filters, orderBy, CRUD inputs, custom inputs, payload types)
  // Always generate if we have tables or custom operations
  if (tables.length > 0 || (typeRegistry && (hasCustomQueries || hasCustomMutations))) {
    const allOps = [
      ...(customOperations?.queries ?? []),
      ...(customOperations?.mutations ?? []),
    ];
    const usedInputTypes = collectInputTypeNames(allOps);
    const usedPayloadTypes = collectPayloadTypeNames(allOps);

    // Also include payload types for table CRUD mutations (they reference Edge types)
    if (typeRegistry) {
      for (const table of tables) {
        const typeName = table.name;
        // Add standard CRUD payload types
        const crudPayloadTypes = [
          `Create${typeName}Payload`,
          `Update${typeName}Payload`,
          `Delete${typeName}Payload`,
        ];
        for (const payloadType of crudPayloadTypes) {
          if (typeRegistry.has(payloadType)) {
            usedPayloadTypes.add(payloadType);
          }
        }
      }
    }

    const inputTypesFile = generateInputTypesFile(
      typeRegistry ?? new Map(),
      usedInputTypes,
      tables,
      usedPayloadTypes
    );
    files.push({ path: inputTypesFile.fileName, content: inputTypesFile.content });
  }

  // 5. Generate custom operations (if any)
  if (hasCustomQueries && customOperations?.queries) {
    const queryOpsFile = generateCustomQueryOpsFile(customOperations.queries);
    files.push({ path: queryOpsFile.fileName, content: queryOpsFile.content });
  }

  if (hasCustomMutations && customOperations?.mutations) {
    const mutationOpsFile = generateCustomMutationOpsFile(customOperations.mutations);
    files.push({ path: mutationOpsFile.fileName, content: mutationOpsFile.content });
  }

  // 6. Generate types barrel
  const typesBarrel = generateTypesBarrel(useSharedTypes);
  files.push({ path: typesBarrel.fileName, content: typesBarrel.content });

  // 7. Generate main index.ts with createClient
  const indexFile = generateCreateClientFile(tables, hasCustomQueries, hasCustomMutations);
  files.push({ path: indexFile.fileName, content: indexFile.content });

  return {
    files,
    stats: {
      tables: tables.length,
      customQueries: customOperations?.queries.length ?? 0,
      customMutations: customOperations?.mutations.length ?? 0,
      totalFiles: files.length,
    },
  };
}

// Re-export generators for direct use
export { generateOrmClientFile, generateQueryBuilderFile, generateSelectTypesFile } from './client-generator';
export { generateModelFile, generateAllModelFiles } from './model-generator';
export { generateCustomQueryOpsFile, generateCustomMutationOpsFile } from './custom-ops-generator';
export { generateModelsBarrel, generateTypesBarrel } from './barrel';
