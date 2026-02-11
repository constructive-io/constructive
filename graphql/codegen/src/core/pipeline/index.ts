/**
 * Shared Codegen Pipeline
 *
 * Consolidates the common logic between generate and generate-orm commands.
 * Handles:
 * - Schema fetching from source (endpoint or file)
 * - Table inference from introspection
 * - Operation transformation
 * - Filtering
 */
import type { GraphQLSDKConfigTarget } from '../../types/config';
import type {
  CleanOperation,
  CleanTable,
  TypeRegistry,
} from '../../types/schema';
import { inferTablesFromIntrospection } from '../introspect/infer-tables';
import type { SchemaSource } from '../introspect/source';
import { filterTables } from '../introspect/transform';
import {
  filterOperations,
  getCustomOperations,
  getTableOperationNames,
  transformSchemaToOperations,
} from '../introspect/transform-schema';

// Re-export for convenience
export type { SchemaSource } from '../introspect/source';
export {
  createSchemaSource,
  validateSourceOptions,
} from '../introspect/source';

// ============================================================================
// Pipeline Types
// ============================================================================

export interface CodegenPipelineOptions {
  /**
   * Schema source (endpoint or file)
   */
  source: SchemaSource;

  /**
   * Configuration
   */
  config: GraphQLSDKConfigTarget;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;

  /**
   * Skip custom operations (only generate table CRUD)
   */
  skipCustomOperations?: boolean;
}

export interface CodegenPipelineResult {
  /**
   * Inferred table metadata
   */
  tables: CleanTable[];

  /**
   * Custom operations (queries and mutations not covered by tables)
   */
  customOperations: {
    queries: CleanOperation[];
    mutations: CleanOperation[];
    typeRegistry: TypeRegistry;
  };

  /**
   * Statistics about what was found
   */
  stats: {
    totalTables: number;
    filteredTables: number;
    totalQueries: number;
    totalMutations: number;
    customQueries: number;
    customMutations: number;
  };
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Run the unified codegen pipeline
 *
 * This replaces the duplicated logic in generate.ts and generate-orm.ts:
 * 1. Fetch introspection from source (endpoint or file)
 * 2. Infer tables from introspection (replaces _meta query)
 * 3. Transform to operations
 * 4. Filter by config
 * 5. Separate table operations from custom operations
 */
export async function runCodegenPipeline(
  options: CodegenPipelineOptions,
): Promise<CodegenPipelineResult> {
  const {
    source,
    config,
    verbose = false,
    skipCustomOperations = false,
  } = options;
  const log = verbose ? console.log : () => {};

  // 1. Fetch introspection from source
  log(`Fetching schema from ${source.describe()}...`);
  const { introspection } = await source.fetch();

  // 2. Infer tables from introspection (replaces _meta)
  log('Inferring table metadata from schema...');
  let tables = inferTablesFromIntrospection(introspection);
  const totalTables = tables.length;
  log(`  Found ${totalTables} tables`);

  // 3. Filter tables by config (combine exclude and systemExclude)
  tables = filterTables(tables, config.tables.include, [
    ...config.tables.exclude,
    ...config.tables.systemExclude,
  ]);
  const filteredTables = tables.length;
  log(`  After filtering: ${filteredTables} tables`);

  // 4. Transform introspection to operations
  log('Transforming operations...');
  const {
    queries: allQueries,
    mutations: allMutations,
    typeRegistry,
  } = transformSchemaToOperations(introspection);

  const totalQueries = allQueries.length;
  const totalMutations = allMutations.length;
  log(`  Found ${totalQueries} queries and ${totalMutations} mutations total`);

  // 5. Get table operation names for filtering custom ops
  const tableOperationNames = getTableOperationNames(tables);

  // 6. Filter and separate custom operations
  let customQueries: CleanOperation[] = [];
  let customMutations: CleanOperation[] = [];

  if (!skipCustomOperations) {
    // Filter by config include/exclude (combine exclude and systemExclude)
    const filteredQueries = filterOperations(
      allQueries,
      config.queries.include,
      [...config.queries.exclude, ...config.queries.systemExclude],
    );
    const filteredMutations = filterOperations(
      allMutations,
      config.mutations.include,
      [...config.mutations.exclude, ...config.mutations.systemExclude],
    );

    log(
      `  After config filtering: ${filteredQueries.length} queries, ${filteredMutations.length} mutations`,
    );

    // Remove table operations (already handled by table generators)
    customQueries = getCustomOperations(filteredQueries, tableOperationNames);
    customMutations = getCustomOperations(
      filteredMutations,
      tableOperationNames,
    );

    log(
      `  Custom operations: ${customQueries.length} queries, ${customMutations.length} mutations`,
    );
  }

  return {
    tables,
    customOperations: {
      queries: customQueries,
      mutations: customMutations,
      typeRegistry,
    },
    stats: {
      totalTables,
      filteredTables,
      totalQueries,
      totalMutations,
      customQueries: customQueries.length,
      customMutations: customMutations.length,
    },
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that tables were found
 */
export function validateTablesFound(tables: CleanTable[]): {
  valid: boolean;
  error?: string;
} {
  if (tables.length === 0) {
    return {
      valid: false,
      error:
        'No tables found after filtering. Check your include/exclude patterns.',
    };
  }
  return { valid: true };
}
