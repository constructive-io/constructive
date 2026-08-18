import { createHash } from 'node:crypto';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import { ScopedIntrospectionPreset } from 'graphile-scoped-introspection';
import { makeScopedPgService } from 'graphile-settings';
import { execute, lexicographicSortSchema, parse, printSchema } from 'graphql';
import { makePgService as makePostGraphilePgService } from 'postgraphile/adaptors/pg';

import { measureBenchmarkCase } from './metrics';
import {
  DATABASE_URL_ENV,
  parseWorkerEnvelope,
  redactSecret,
  WORKER_CONFIG_ENV,
  writeWorkerResult,
} from './process';

interface ScopedWorkerConfig {
  mode: 'stock' | 'scoped';
  schemas: string[];
}

const validateConfig = (value: unknown): ScopedWorkerConfig => {
  const config = value as Partial<ScopedWorkerConfig>;
  if (config.mode !== 'stock' && config.mode !== 'scoped') {
    throw new Error(
      'scoped introspection worker requires stock or scoped mode'
    );
  }
  if (
    !Array.isArray(config.schemas) ||
    config.schemas.length === 0 ||
    config.schemas.some(
      (schema) => typeof schema !== 'string' || schema.length === 0
    )
  ) {
    throw new Error(
      'scoped introspection worker requires a non-empty schemas array'
    );
  }
  return { mode: config.mode, schemas: config.schemas };
};

const main = async (): Promise<void> => {
  const databaseUrl = process.env[DATABASE_URL_ENV] ?? '';
  let caseName = 'unknown';
  let release: (() => Promise<void>) | null = null;
  try {
    if (!databaseUrl) throw new Error(`${DATABASE_URL_ENV} is required`);
    const envelope = parseWorkerEnvelope(process.env[WORKER_CONFIG_ENV]);
    caseName = envelope.caseName;
    const config = validateConfig(envelope.workerConfig);
    const serviceOptions = {
      connectionString: databaseUrl,
      schemas: config.schemas,
      pubsub: false,
    };
    const service =
      config.mode === 'stock'
        ? makePostGraphilePgService(serviceOptions)
        : makeScopedPgService({
            ...serviceOptions,
            introspectionScopedCatalogTypes: 'dependency-closure',
          });
    release = async () => {
      await service.release();
    };

    const result = await measureBenchmarkCase(
      caseName,
      async () =>
        makeSchema({
          extends: [
            graphileBuildPreset,
            graphileBuildPgPreset,
            ...(config.mode === 'scoped' ? [ScopedIntrospectionPreset] : []),
          ],
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
          metadata: { introspectionMode: config.mode },
        };
      }
    );
    writeWorkerResult(result);
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
  } finally {
    await release?.();
  }
};

if (require.main === module) void main();
