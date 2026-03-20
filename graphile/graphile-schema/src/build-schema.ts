import deepmerge from 'deepmerge'
import { printSchema } from 'graphql'
import { ConstructivePreset, makePgService, _cachedTablesMeta } from 'graphile-settings'
import { makeSchema } from 'graphile-build'
import { getPgPool } from 'pg-cache'
import { getPgEnvOptions } from 'pg-env'
import type { GraphileConfig } from 'graphile-config'

export type BuildSchemaOptions = {
  database?: string;
  schemas: string[];
  graphile?: Partial<GraphileConfig.Preset>;
};

export interface BuildSchemaWithMetaResult {
  sdl: string;
  /** Table metadata collected by MetaSchemaPlugin during schema build */
  tablesMeta: unknown[];
}

async function buildSchemaInternal(opts: BuildSchemaOptions) {
  const database = opts.database ?? 'constructive'
  const schemas = Array.isArray(opts.schemas) ? opts.schemas : []

  const config = getPgEnvOptions({ database })

  // Create the pool through pg-cache so it is tracked and can be cleaned up
  // by callers via pgCache.delete(database) before dropping ephemeral databases.
  // Without this, makePgService creates its own internal pool that isn't released,
  // causing "database has active sessions" errors during ephemeral DB teardown.
  const pool = getPgPool(config)

  const basePreset: GraphileConfig.Preset = {
    extends: [ConstructivePreset],
    pgServices: [
      makePgService({
        pool,
        schemas,
      }),
    ],
  }

  const preset: GraphileConfig.Preset = opts.graphile
    ? deepmerge(basePreset, opts.graphile)
    : basePreset

  const { schema } = await makeSchema(preset)
  return { schema }
}

export async function buildSchemaSDL(opts: BuildSchemaOptions): Promise<string> {
  const { schema } = await buildSchemaInternal(opts)
  return printSchema(schema)
}

/**
 * Build schema SDL and also return _meta table metadata.
 * The MetaSchemaPlugin populates a module-level cache during makeSchema();
 * we snapshot it immediately after the build completes.
 */
export async function buildSchemaWithMeta(opts: BuildSchemaOptions): Promise<BuildSchemaWithMetaResult> {
  const { schema } = await buildSchemaInternal(opts)
  return {
    sdl: printSchema(schema),
    tablesMeta: [..._cachedTablesMeta],
  }
}
