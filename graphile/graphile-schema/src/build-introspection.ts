import type { TableMeta } from 'graphile-settings'
import { _cachedTablesMeta } from 'graphile-settings'
import { buildSchemaSDL } from './build-schema'
import type { BuildSchemaOptions } from './build-schema'

export type { BuildSchemaOptions as BuildIntrospectionOptions }

/**
 * Build introspection metadata for all tables visible in the given schemas.
 *
 * Internally calls `buildSchemaSDL()` which triggers the MetaSchemaPlugin
 * gather hook, populating `_cachedTablesMeta` as a side-effect. The cached
 * metadata is then returned as a plain array of `TableMeta` objects.
 *
 * The result includes every table's fields, types, constraints, indexes,
 * relations, inflection names, and query entry-points — the same data
 * exposed by the `_meta` GraphQL query at runtime.
 *
 * @example
 * ```ts
 * import { buildIntrospectionJSON } from 'graphile-schema';
 * import fs from 'fs';
 *
 * const tables = await buildIntrospectionJSON({
 *   database: 'my_db',
 *   schemas: ['public', 'app_public'],
 * });
 * fs.writeFileSync('introspection.json', JSON.stringify(tables, null, 2));
 * ```
 */
export async function buildIntrospectionJSON(
  opts: BuildSchemaOptions
): Promise<TableMeta[]> {
  await buildSchemaSDL(opts)
  return [..._cachedTablesMeta]
}
