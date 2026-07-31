import type { TableMeta } from './types';

/**
 * @deprecated Process-global, best-effort compatibility state only. It has no
 * association with a database, schema list, or `GraphQLSchema`, so concurrent
 * builds in one process can overwrite each other's value. Use
 * `getTablesMetaForSchema(schema)` (or `buildSchemaArtifacts()` in
 * graphile-schema) to obtain metadata correlated to a specific schema.
 */
export let cachedTablesMeta: TableMeta[] = [];

export function getCachedTablesMeta(): TableMeta[] {
  return cachedTablesMeta;
}

export function setCachedTablesMeta(tablesMeta: TableMeta[]): void {
  cachedTablesMeta = tablesMeta;
}
