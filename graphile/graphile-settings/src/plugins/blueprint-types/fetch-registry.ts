/**
 * Fetch Node Type Registry
 *
 * Queries the node_type_registry table from the database at schema build time.
 * Used to populate the BlueprintTypesPlugin with real node type entries
 * so that @oneOf types reflect the actual registered node types.
 *
 * The query uses the metaschema_public schema and selects all columns
 * needed by the plugin: name, slug, category, display_name, description,
 * parameter_schema, and tags.
 */

import { Pool } from 'pg';
import type { NodeTypeRegistryEntry } from './plugin';

/**
 * Fetch all node_type_registry entries from the database.
 *
 * Connects using the provided connection string, queries
 * metaschema_public.node_type_registry, and returns the rows
 * as NodeTypeRegistryEntry[].
 *
 * If the table doesn't exist or the query fails (e.g., the database
 * hasn't been migrated yet), returns an empty array and logs a warning.
 *
 * @param connectionString - PostgreSQL connection string
 * @returns Array of node type registry entries
 */
export async function fetchNodeTypeRegistry(
  connectionString: string,
): Promise<NodeTypeRegistryEntry[]> {
  const pool = new Pool({ connectionString, max: 1 });

  try {
    const result = await pool.query<NodeTypeRegistryEntry>(`
      SELECT
        name,
        slug,
        category,
        COALESCE(display_name, name) as display_name,
        COALESCE(description, '') as description,
        COALESCE(parameter_schema, '{}'::jsonb) as parameter_schema,
        COALESCE(tags, '{}') as tags
      FROM metaschema_public.node_type_registry
      ORDER BY category, name
    `);

    return result.rows;
  } catch (error: unknown) {
    // If the table doesn't exist yet (not migrated), return empty gracefully
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === '42P01') {
      // 42P01 = undefined_table
      // This is expected when the database hasn't been migrated with the metaschema package
      return [];
    }

    // For other errors, log a warning and return empty
    // This ensures the schema build doesn't fail just because
    // node_type_registry isn't accessible
    console.warn(
      '[BlueprintTypesPlugin] Failed to fetch node_type_registry:',
      pgError.message ?? String(error),
    );
    return [];
  } finally {
    await pool.end();
  }
}
