import type { TableMeta } from 'graphile-settings';

import type { BuildSchemaOptions } from './build-schema';
import { buildSchemaArtifacts } from './build-schema';

export type { BuildSchemaOptions as BuildIntrospectionOptions };

/**
 * Build introspection metadata for all tables visible in the given schemas.
 *
 * Internally calls `buildSchemaArtifacts()`, which returns SDL and `_meta`
 * metadata from one correlated build boundary — both derived from the same
 * final executable `GraphQLSchema` — so concurrent builds in one process
 * cannot return each other's metadata.
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
  return (await buildSchemaArtifacts(opts)).tablesMeta;
}
