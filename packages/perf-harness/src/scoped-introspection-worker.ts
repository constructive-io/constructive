import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import { lexicographicSortSchema, parse, printSchema } from 'graphql';
import { withPgClientFromPgService } from 'postgraphile/@dataplan/pg';
import { makePgService } from 'postgraphile/adaptors/pg';
import { execute } from 'postgraphile/grafast';

import { measureBenchmarkCase } from './metrics';
import {
  parseWorkerProcessArgs,
  redactSecret,
  writeWorkerResult,
} from './process';
import type { JsonValue, SuccessfulWorkerResult, WorkerResult } from './types';

interface ScopedConfig {
  mode: 'stock' | 'scoped';
  schemas: string[];
  runtimeCheck?: { query: string; expectedData: JsonValue };
}

const validateConfig = (value: unknown): ScopedConfig => {
  const config = value as Partial<ScopedConfig> | null;
  if (config?.mode !== 'stock' && config?.mode !== 'scoped') {
    throw new Error(
      'scoped introspection worker requires stock or scoped mode'
    );
  }
  const { schemas, runtimeCheck } = config;
  if (
    !Array.isArray(schemas) ||
    schemas.length === 0 ||
    schemas.some((schema) => typeof schema !== 'string' || schema.length === 0)
  ) {
    throw new Error(
      'scoped introspection worker requires a non-empty schemas array'
    );
  }
  if (
    runtimeCheck !== undefined &&
    (runtimeCheck === null ||
      typeof runtimeCheck.query !== 'string' ||
      runtimeCheck.query.length === 0 ||
      runtimeCheck.expectedData === undefined)
  ) {
    throw new Error('runtimeCheck requires a query and expectedData');
  }
  return { mode: config.mode, schemas, runtimeCheck };
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

export const runScopedIntrospectionWorker = async (
  args: readonly string[] = process.argv.slice(2),
  loadScopedPreset: () => Promise<GraphileConfig.Preset> = async () =>
    (await import('graphile-scoped-introspection')).ScopedIntrospectionPreset
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
      name: 'main',
      connectionString: databaseUrl,
      schemas: config.schemas,
      pubsub: false,
    });
    const scopedPreset =
      config.mode === 'scoped' ? await loadScopedPreset() : undefined;
    const pgService = service;
    successfulResult = await measureBenchmarkCase(
      caseName,
      async () =>
        makeSchema({
          extends: [
            graphileBuildPreset,
            graphileBuildPgPreset,
            ...(scopedPreset ? [scopedPreset] : []),
          ],
          pgServices: [pgService],
          ...(scopedPreset
            ? { gather: { pgScopedIntrospection: { main: true } } }
            : {}),
        }),
      async ({ schema, resolvedPreset }) => {
        const execution = await execute({
          schema,
          document: parse(config.runtimeCheck?.query ?? '{ __typename }'),
          resolvedPreset,
          contextValue: {
            [pgService.pgSettingsKey!]: {},
            [pgService.withPgClientKey!]: withPgClientFromPgService.bind(
              null,
              pgService
            ),
          },
        });
        if (
          Symbol.asyncIterator in execution ||
          execution.errors?.length ||
          !isDeepStrictEqual(
            JSON.parse(JSON.stringify(execution.data ?? null)),
            config.runtimeCheck?.expectedData ?? { __typename: 'Query' }
          )
        ) {
          throw new Error(
            `runtime verification query failed: ${JSON.stringify(execution)}`
          );
        }
        const schemaText = printSchema(lexicographicSortSchema(schema));
        return {
          schemaHash: createHash('sha256').update(schemaText).digest('hex'),
          schemaTypeCount: Object.keys(schema.getTypeMap()).length,
          runtimeVerified: true as const,
          metadata: {
            introspectionMode: config.mode,
            runtimeQuery: config.runtimeCheck?.query ?? '{ __typename }',
          },
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
  void runScopedIntrospectionWorker();
}
