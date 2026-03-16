import deepmerge from 'deepmerge'
import { printSchema } from 'graphql'
import { ConstructivePreset, makePgService } from 'graphile-settings'
import { makeSchema } from 'graphile-build'
import { buildConnectionString } from 'pg-cache'
import { getPgEnvOptions } from 'pg-env'
import type { GraphileConfig } from 'graphile-config'
import { getCachedTablesMeta } from 'graphile-misc-plugins';
import type { TableMeta } from 'graphile-misc-plugins';

export type BuildSchemaOptions = {
  database?: string;
  schemas: string[];
  graphile?: Partial<GraphileConfig.Preset>;
};

export interface BuildSchemaResult {
  sdl: string;
  tablesMeta: TableMeta[];
}

/**
 * Build a GraphQL schema from a PostgreSQL database and return both
 * the SDL string and the table metadata collected by MetaSchemaPlugin.
 *
 * The tablesMeta is captured immediately after makeSchema() returns,
 * before the module-level cache can be overwritten by concurrent calls.
 */
export async function buildSchemaWithMeta(opts: BuildSchemaOptions): Promise<BuildSchemaResult> {
  const database = opts.database ?? 'constructive'
  const schemas = Array.isArray(opts.schemas) ? opts.schemas : []

  const config = getPgEnvOptions({ database })
  const connectionString = buildConnectionString(
    config.user,
    config.password,
    config.host,
    config.port,
    config.database,
  )

  const basePreset: GraphileConfig.Preset = {
    extends: [ConstructivePreset],
    pgServices: [
      makePgService({
        connectionString,
        schemas,
      }),
    ],
  }

  const preset: GraphileConfig.Preset = opts.graphile
    ? deepmerge(basePreset, opts.graphile)
    : basePreset

  const { schema } = await makeSchema(preset)
  // Capture tablesMeta immediately — the MetaSchemaPlugin's init hook
  // populates cachedTablesMeta during makeSchema(). Grab it now before
  // any concurrent call to makeSchema() overwrites the module-level cache.
  const tablesMeta = getCachedTablesMeta();
  const sdl = printSchema(schema)
  return { sdl, tablesMeta };
}

/**
 * Build a GraphQL schema SDL string from a PostgreSQL database.
 * For backward compatibility — use buildSchemaWithMeta() when you also need table metadata.
 */
export async function buildSchemaSDL(opts: BuildSchemaOptions): Promise<string> {
  const { sdl } = await buildSchemaWithMeta(opts);
  return sdl;
}
