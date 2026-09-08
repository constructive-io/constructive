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
  parseWorkerProcessArgs,
  redactSecret,
  writeWorkerResult,
} from './process';
import type { SuccessfulWorkerResult, WorkerResult } from './types';

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

const failureToText = (failure: unknown): string => {
  try {
    if (failure instanceof Error) {
      const message: unknown = failure.message;
      return typeof message === 'string' ? message : 'unknown error';
    }
    if (
      failure === null ||
      (typeof failure !== 'object' && typeof failure !== 'function')
    ) {
      return String(failure);
    }
  } catch {
    // A hostile proxy or Error.message getter must not prevent reporting.
  }
  return 'unknown error';
};

export const runStockWorker = async (
  args: readonly string[] = process.argv.slice(2)
): Promise<void> => {
  let databaseUrl = '';
  let caseName = 'unknown';
  let service: ReturnType<typeof makePgService> | undefined;
  let primaryCaptured = false;
  let primaryFailure: unknown;
  let cleanupCaptured = false;
  let cleanupFailure: unknown;
  let successfulResult: SuccessfulWorkerResult | undefined;

  try {
    const workerArgs = parseWorkerProcessArgs(args);
    databaseUrl = workerArgs.databaseUrl;
    const { envelope } = workerArgs;
    caseName = envelope.caseName;
    const config = validateConfig(envelope.workerConfig);
    service = makePgService({
      connectionString: databaseUrl,
      schemas: config.schemas,
      pubsub: false,
    });
    successfulResult = await measureBenchmarkCase(
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
  } catch (error) {
    primaryCaptured = true;
    primaryFailure = error;
  }

  if (service !== undefined && service !== null) {
    try {
      await service.release();
    } catch (error) {
      cleanupCaptured = true;
      cleanupFailure = error;
    }
  }

  let result: WorkerResult;
  if (primaryCaptured || cleanupCaptured) {
    const failures: string[] = [];
    if (primaryCaptured) failures.push(failureToText(primaryFailure));
    if (cleanupCaptured) failures.push(failureToText(cleanupFailure));
    process.exitCode = 1;
    result = {
      status: 'error',
      pid: process.pid,
      caseName,
      error: redactSecret(failures.join('; '), databaseUrl),
    };
  } else {
    result = successfulResult as SuccessfulWorkerResult;
  }

  // Classification and cleanup are complete before this single terminal
  // protocol write. A write failure must not enter another result path.
  writeWorkerResult(result);
};

if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  void runStockWorker();
}
