/**
 * Code generation orchestrator
 *
 * Coordinates all code generators to produce the complete SDK output.
 * Hooks delegate to ORM model methods - types are imported from ORM's input-types.ts.
 *
 * Output structure:
 * generated/
 *   index.ts              - Main barrel export
 *   client.ts             - ORM client wrapper (configure/getClient)
 *   queries/
 *     index.ts            - Query hooks barrel
 *     useCarsQuery.ts     - List query hook -> ORM findMany
 *     useCarQuery.ts      - Single item query hook -> ORM findOne
 *     useCurrentUserQuery.ts - Custom query hook -> ORM query.xxx
 *     ...
 *   mutations/
 *     index.ts            - Mutation hooks barrel
 *     useCreateCarMutation.ts  - -> ORM create
 *     useUpdateCarMutation.ts  - -> ORM update
 *     useDeleteCarMutation.ts  - -> ORM delete
 *     useLoginMutation.ts      - Custom mutation -> ORM mutation.xxx
 *     ...
 */
import type { GraphQLSDKConfigTarget, QueryKeyConfig } from '../../types/config';
import { DEFAULT_QUERY_KEY_CONFIG } from '../../types/config';
import type {
  CleanOperation,
  CleanTable,
  TypeRegistry
} from '../../types/schema';
import {
  generateCustomMutationsBarrel,
  generateCustomQueriesBarrel,
  generateMainBarrel,
  generateMutationsBarrel,
  generateQueriesBarrel
} from './barrel';
import { generateClientFile } from './client';
import { generateAllCustomMutationHooks } from './custom-mutations';
import { generateAllCustomQueryHooks } from './custom-queries';
import { generateInvalidationFile } from './invalidation';
import { generateMutationKeysFile } from './mutation-keys';
import { generateAllMutationHooks } from './mutations';
import { generateAllQueryHooks } from './queries';
import { generateQueryKeysFile } from './query-keys';
import { getTableNames } from './utils';

// ============================================================================
// Types
// ============================================================================

export interface GeneratedFile {
  /** Relative path from output directory */
  path: string;
  /** File content */
  content: string;
}

export interface GenerateResult {
  files: GeneratedFile[];
  stats: {
    tables: number;
    queryHooks: number;
    mutationHooks: number;
    customQueryHooks: number;
    customMutationHooks: number;
    totalFiles: number;
  };
}

export interface GenerateOptions {
  /** Tables from _meta introspection */
  tables: CleanTable[];
  /** Custom operations from __schema introspection */
  customOperations?: {
    queries: CleanOperation[];
    mutations: CleanOperation[];
    typeRegistry: TypeRegistry;
  };
  /** Configuration */
  config: GraphQLSDKConfigTarget;
  /**
   * Path to shared types directory (relative import path).
   * When provided, types.ts and schema-types.ts are NOT generated
   * and imports reference the shared types location instead.
   * Example: '..' means types are in parent directory
   */
  sharedTypesPath?: string;
}

// ============================================================================
// Main orchestrator
// ============================================================================

/**
 * Generate all SDK files for tables only
 */
export function generateAllFiles(
  tables: CleanTable[],
  config: GraphQLSDKConfigTarget
): GenerateResult {
  return generate({ tables, config });
}

/**
 * Generate all SDK files with full support for custom operations
 *
 * When sharedTypesPath is provided, types.ts and schema-types.ts are NOT generated
 * (they're expected to exist in the shared types directory).
 */
export function generate(options: GenerateOptions): GenerateResult {
  const { tables, customOperations, config } = options;
  const files: GeneratedFile[] = [];

  // Extract codegen options
  const maxDepth = config.codegen.maxFieldDepth;
  const skipQueryField = config.codegen.skipQueryField;
  const reactQueryEnabled = config.reactQuery;

  // Query key configuration (use defaults if not provided)
  const queryKeyConfig: QueryKeyConfig = config.queryKeys ?? DEFAULT_QUERY_KEY_CONFIG;
  const useCentralizedKeys = queryKeyConfig.generateScopedKeys;
  const hasRelationships = Object.keys(queryKeyConfig.relationships).length > 0;

  // 1. Generate client.ts (ORM client wrapper)
  files.push({
    path: 'client.ts',
    content: generateClientFile()
  });

  // Collect table type names for import path resolution
  const tableTypeNames = new Set(tables.map((t) => getTableNames(t).typeName));

  // NOTE: types.ts and schema-types.ts are no longer generated here.
  // Hooks now import types directly from the ORM's input-types.ts,
  // which serves as the single source of truth for all types.

  // 3b. Generate centralized query keys (query-keys.ts)
  let hasQueryKeys = false;
  if (useCentralizedKeys) {
    const queryKeysResult = generateQueryKeysFile({
      tables,
      customQueries: customOperations?.queries ?? [],
      config: queryKeyConfig
    });
    files.push({
      path: queryKeysResult.fileName,
      content: queryKeysResult.content
    });
    hasQueryKeys = true;
  }

  // 3c. Generate centralized mutation keys (mutation-keys.ts)
  let hasMutationKeys = false;
  if (useCentralizedKeys && queryKeyConfig.generateMutationKeys) {
    const mutationKeysResult = generateMutationKeysFile({
      tables,
      customMutations: customOperations?.mutations ?? [],
      config: queryKeyConfig
    });
    files.push({
      path: mutationKeysResult.fileName,
      content: mutationKeysResult.content
    });
    hasMutationKeys = true;
  }

  // 3d. Generate cache invalidation helpers (invalidation.ts)
  let hasInvalidation = false;
  if (useCentralizedKeys && queryKeyConfig.generateCascadeHelpers) {
    const invalidationResult = generateInvalidationFile({
      tables,
      config: queryKeyConfig
    });
    files.push({
      path: invalidationResult.fileName,
      content: invalidationResult.content
    });
    hasInvalidation = true;
  }

  // 4. Generate table-based query hooks (queries/*.ts)
  const queryHooks = generateAllQueryHooks(tables, {
    reactQueryEnabled,
    useCentralizedKeys,
    hasRelationships
  });
  for (const hook of queryHooks) {
    files.push({
      path: `queries/${hook.fileName}`,
      content: hook.content
    });
  }

  // 5. Generate custom query hooks if available
  let customQueryHooks: Array<{
    fileName: string;
    content: string;
    operationName: string;
  }> = [];
  if (customOperations && customOperations.queries.length > 0) {
    customQueryHooks = generateAllCustomQueryHooks({
      operations: customOperations.queries,
      typeRegistry: customOperations.typeRegistry,
      maxDepth,
      skipQueryField,
      reactQueryEnabled,
      tableTypeNames,
      useCentralizedKeys
    });

    for (const hook of customQueryHooks) {
      files.push({
        path: `queries/${hook.fileName}`,
        content: hook.content
      });
    }
  }

  // 5. Generate queries/index.ts barrel (includes both table and custom queries)
  files.push({
    path: 'queries/index.ts',
    content:
      customQueryHooks.length > 0
        ? generateCustomQueriesBarrel(
          tables,
          customQueryHooks.map((h) => h.operationName)
        )
        : generateQueriesBarrel(tables)
  });

  // 6. Generate table-based mutation hooks (mutations/*.ts)
  const mutationHooks = generateAllMutationHooks(tables, {
    reactQueryEnabled,
    useCentralizedKeys
  });
  for (const hook of mutationHooks) {
    files.push({
      path: `mutations/${hook.fileName}`,
      content: hook.content
    });
  }

  // 7. Generate custom mutation hooks if available
  let customMutationHooks: Array<{
    fileName: string;
    content: string;
    operationName: string;
  }> = [];
  if (customOperations && customOperations.mutations.length > 0) {
    customMutationHooks = generateAllCustomMutationHooks({
      operations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
      maxDepth,
      skipQueryField,
      reactQueryEnabled,
      tableTypeNames,
      useCentralizedKeys
    });

    for (const hook of customMutationHooks) {
      files.push({
        path: `mutations/${hook.fileName}`,
        content: hook.content
      });
    }
  }

  // 8. Generate mutations/index.ts barrel (only if React Query is enabled)
  // When reactQuery is disabled, no mutation hooks are generated, so skip the barrel
  const hasMutations =
    mutationHooks.length > 0 || customMutationHooks.length > 0;
  if (hasMutations) {
    files.push({
      path: 'mutations/index.ts',
      content:
        customMutationHooks.length > 0
          ? generateCustomMutationsBarrel(
            tables,
            customMutationHooks.map((h) => h.operationName)
          )
          : generateMutationsBarrel(tables)
    });
  }

  // 9. Generate main index.ts barrel
  // No longer includes types.ts or schema-types.ts - hooks import from ORM directly
  files.push({
    path: 'index.ts',
    content: generateMainBarrel(tables, {
      hasMutations,
      hasQueryKeys,
      hasMutationKeys,
      hasInvalidation
    })
  });

  return {
    files,
    stats: {
      tables: tables.length,
      queryHooks: queryHooks.length,
      mutationHooks: mutationHooks.length,
      customQueryHooks: customQueryHooks.length,
      customMutationHooks: customMutationHooks.length,
      totalFiles: files.length
    }
  };
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  generateCustomMutationsBarrel,
  generateCustomQueriesBarrel,
  generateMainBarrel,
  generateMutationsBarrel,
  generateQueriesBarrel
} from './barrel';
export { generateClientFile } from './client';
export {
  generateAllCustomMutationHooks,
  generateCustomMutationHook
} from './custom-mutations';
export {
  generateAllCustomQueryHooks,
  generateCustomQueryHook
} from './custom-queries';
export { generateInvalidationFile } from './invalidation';
export { generateMutationKeysFile } from './mutation-keys';
export {
  generateAllMutationHooks,
  generateCreateMutationHook,
  generateDeleteMutationHook,
  generateUpdateMutationHook
} from './mutations';
export {
  generateAllQueryHooks,
  generateListQueryHook,
  generateSingleQueryHook
} from './queries';
export { generateQueryKeysFile } from './query-keys';
