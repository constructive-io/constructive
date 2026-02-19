import deepmerge from 'deepmerge'
import { printSchema } from 'graphql'
import { ConstructivePreset, makePgService } from 'graphile-settings'
import { makeSchema } from 'graphile-build'
import { buildConnectionString } from 'pg-cache'
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
  return printSchema(schema)
}
