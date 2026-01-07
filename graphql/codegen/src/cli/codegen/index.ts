/**
 * Code generation orchestrator
 *
 * Coordinates all code generators to produce the complete SDK output.
 *
 * Output structure:
 * generated/
 *   index.ts              - Main barrel export
 *   client.ts             - GraphQL client with configure() and execute()
 *   types.ts              - Entity interfaces and filter types
 *   queries/
 *     index.ts            - Query hooks barrel
 *     useCarsQuery.ts     - List query hook (table-based)
 *     useCarQuery.ts      - Single item query hook (table-based)
 *     useCurrentUserQuery.ts - Custom query hook
 *     ...
 *   mutations/
 *     index.ts            - Mutation hooks barrel
 *     useCreateCarMutation.ts  - Table-based CRUD
 *     useUpdateCarMutation.ts
 *     useDeleteCarMutation.ts
 *     useLoginMutation.ts      - Custom mutation
 *     useRegisterMutation.ts
 *     ...
 */
import type { CleanTable, CleanOperation, TypeRegistry } from '../../types/schema';
import type { ResolvedConfig } from '../../types/config';

import { generateClientFile } from './client';
import { generateTypesFile } from './types';
import { generateAllQueryHooks } from './queries';
import { generateAllMutationHooks } from './mutations';
import { generateAllCustomQueryHooks } from './custom-queries';
import { generateAllCustomMutationHooks } from './custom-mutations';
import {
  generateQueriesBarrel,
  generateMutationsBarrel,
  generateMainBarrel,
  generateCustomQueriesBarrel,
  generateCustomMutationsBarrel,
} from './barrel';

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
  /** Resolved configuration */
  config: ResolvedConfig;
}

// ============================================================================
// Main orchestrator
// ============================================================================

/**
 * Generate all SDK files for tables only (legacy function signature)
 */
export function generateAllFiles(
  tables: CleanTable[],
  config: ResolvedConfig
): GenerateResult {
  return generate({ tables, config });
}

/**
 * Generate all SDK files with full support for custom operations
 */
export function generate(options: GenerateOptions): GenerateResult {
  const { tables, customOperations, config } = options;
  const files: GeneratedFile[] = [];

  // Extract codegen options
  const maxDepth = config.codegen.maxFieldDepth;
  const skipQueryField = config.codegen.skipQueryField;
  const reactQueryEnabled = config.reactQuery.enabled;

  // 1. Generate client.ts
  files.push({
    path: 'client.ts',
    content: generateClientFile(),
  });

  // 2. Generate types.ts
  files.push({
    path: 'types.ts',
    content: generateTypesFile(tables),
  });

  // 3. Generate table-based query hooks (queries/*.ts)
  const queryHooks = generateAllQueryHooks(tables, { reactQueryEnabled });
  for (const hook of queryHooks) {
    files.push({
      path: `queries/${hook.fileName}`,
      content: hook.content,
    });
  }

  // 4. Generate custom query hooks if available
  let customQueryHooks: Array<{ fileName: string; content: string; operationName: string }> = [];
  if (customOperations && customOperations.queries.length > 0) {
    customQueryHooks = generateAllCustomQueryHooks({
      operations: customOperations.queries,
      typeRegistry: customOperations.typeRegistry,
      maxDepth,
      skipQueryField,
      reactQueryEnabled,
    });

    for (const hook of customQueryHooks) {
      files.push({
        path: `queries/${hook.fileName}`,
        content: hook.content,
      });
    }
  }

  // 5. Generate queries/index.ts barrel (includes both table and custom queries)
  files.push({
    path: 'queries/index.ts',
    content: customQueryHooks.length > 0
      ? generateCustomQueriesBarrel(tables, customQueryHooks.map((h) => h.operationName))
      : generateQueriesBarrel(tables),
  });

  // 6. Generate table-based mutation hooks (mutations/*.ts)
  const mutationHooks = generateAllMutationHooks(tables, { reactQueryEnabled });
  for (const hook of mutationHooks) {
    files.push({
      path: `mutations/${hook.fileName}`,
      content: hook.content,
    });
  }

  // 7. Generate custom mutation hooks if available
  let customMutationHooks: Array<{ fileName: string; content: string; operationName: string }> = [];
  if (customOperations && customOperations.mutations.length > 0) {
    customMutationHooks = generateAllCustomMutationHooks({
      operations: customOperations.mutations,
      typeRegistry: customOperations.typeRegistry,
      maxDepth,
      skipQueryField,
      reactQueryEnabled,
    });

    for (const hook of customMutationHooks) {
      files.push({
        path: `mutations/${hook.fileName}`,
        content: hook.content,
      });
    }
  }

  // 8. Generate mutations/index.ts barrel (includes both table and custom mutations)
  files.push({
    path: 'mutations/index.ts',
    content: customMutationHooks.length > 0
      ? generateCustomMutationsBarrel(tables, customMutationHooks.map((h) => h.operationName))
      : generateMutationsBarrel(tables),
  });

  // 9. Generate main index.ts barrel
  files.push({
    path: 'index.ts',
    content: generateMainBarrel(tables),
  });

  return {
    files,
    stats: {
      tables: tables.length,
      queryHooks: queryHooks.length,
      mutationHooks: mutationHooks.length,
      customQueryHooks: customQueryHooks.length,
      customMutationHooks: customMutationHooks.length,
      totalFiles: files.length,
    },
  };
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { generateClientFile } from './client';
export { generateTypesFile } from './types';
export { generateAllQueryHooks, generateListQueryHook, generateSingleQueryHook } from './queries';
export {
  generateAllMutationHooks,
  generateCreateMutationHook,
  generateUpdateMutationHook,
  generateDeleteMutationHook,
} from './mutations';
export { generateAllCustomQueryHooks, generateCustomQueryHook } from './custom-queries';
export { generateAllCustomMutationHooks, generateCustomMutationHook } from './custom-mutations';
export {
  generateQueriesBarrel,
  generateMutationsBarrel,
  generateMainBarrel,
  generateCustomQueriesBarrel,
  generateCustomMutationsBarrel,
} from './barrel';
