import deepmerge from 'deepmerge'
import { printSchema } from 'graphql'
import { ConstructivePreset, makePgService } from 'graphile-settings'
import { makeSchema } from 'graphile-build'
import { getPgPool } from 'pg-cache'
import { getPgEnvOptions } from 'pg-env'
import type { GraphileConfig } from 'graphile-config'

export type BuildSchemaOptions = {
  database?: string;
  schemas: string[];
  graphile?: Partial<GraphileConfig.Preset>;
};

export async function buildSchemaSDL(opts: BuildSchemaOptions): Promise<string> {
  const database = opts.database ?? 'constructive'
  const schemas = Array.isArray(opts.schemas) ? opts.schemas : []

  const config = getPgEnvOptions({ database })

  // Create the pool through pg-cache so it is tracked and can be cleaned up
  // by callers via pgCache.delete(database) before dropping ephemeral databases.
  // Without this, makePgService creates its own internal pool that isn't released,
  // causing "database has active sessions" errors during ephemeral DB teardown.
  const pool = getPgPool(config)

  // Hybrid preset composition: use deepmerge for safe scalar/object keys
  // (plugins, disablePlugins, schema, gather, etc.) but pluck out `extends`
  // and `pgServices` to compose them via Graphile's native mechanism.
  // deepmerge cannot deep-clone `extends` (contains the entire PostGraphile
  // preset tree) or `pgServices` (contains pg Pool / EventEmitter internals)
  // without overflowing the call stack.
  const { extends: callerExtends, pgServices: _pgServices, ...callerRest } = opts.graphile ?? {}

  const baseRest: GraphileConfig.Preset = {}

  const preset: GraphileConfig.Preset = {
    ...deepmerge(baseRest, callerRest),
    extends: [
      ConstructivePreset,
      ...(callerExtends ?? []),
    ],
    pgServices: [
      makePgService({
        pool,
        schemas,
      }),
    ],
  }

  const { schema } = await makeSchema(preset)
  return printSchema(schema)
}
