import { createHash } from 'node:crypto';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import { execute, lexicographicSortSchema, parse, printSchema } from 'graphql';
import { makePgService } from 'postgraphile/adaptors/pg';

import { measureBenchmarkCase } from './metrics';
import {
  DATABASE_URL_ENV,
  parseWorkerEnvelope,
  redactSecret,
  WORKER_CONFIG_ENV,
  writeWorkerResult,
} from './process';

interface StockConfig {
  schemas: string[];
}

const validateConfig = (value: unknown): StockConfig => {
  const schemas = (value as Partial<StockConfig>)?.schemas;
  if (
    !Array.isArray(schemas) ||
    schemas.length === 0 ||
    schemas.some((schema) => typeof schema !== 'string' || schema.length === 0)
  ) {
    throw new Error('stock worker requires a non-empty schemas array');
  }
  return { schemas };
};

const main = async (): Promise<void> => {
  const databaseUrl = process.env[DATABASE_URL_ENV] ?? '';
  let caseName = 'unknown';
  try {
    if (!databaseUrl) throw new Error(`${DATABASE_URL_ENV} is required`);
    const envelope = parseWorkerEnvelope(process.env[WORKER_CONFIG_ENV]);
    caseName = envelope.caseName;
    const config = validateConfig(envelope.workerConfig);
    const service = makePgService({
      connectionString: databaseUrl,
      schemas: config.schemas,
      pubsub: false,
    });
    try {
      const result = await measureBenchmarkCase(
        caseName,
        async () =>
          makeSchema({
            extends: [graphileBuildPreset, graphileBuildPgPreset],
            pgServices: [service],
          }),
        async ({ schema }) => {
          const execution = await execute({
            schema,
            document: parse('{ __typename }'),
          });
          if (
            execution.errors?.length ||
            execution.data?.__typename !== 'Query'
          ) {
            throw new Error('runtime verification query failed');
          }
          const schemaText = printSchema(lexicographicSortSchema(schema));
          return {
            schemaHash: createHash('sha256').update(schemaText).digest('hex'),
            schemaTypeCount: Object.keys(schema.getTypeMap()).length,
            runtimeVerified: true as const,
          };
        }
      );
      writeWorkerResult(result);
    } finally {
      await service.release();
    }
  } catch (error) {
    writeWorkerResult({
      status: 'error',
      pid: process.pid,
      caseName,
      error: redactSecret(
        error instanceof Error ? error.message : String(error),
        databaseUrl
      ),
    });
    process.exitCode = 1;
  }
};

if (require.main === module) void main();
