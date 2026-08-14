import { createHash } from 'node:crypto';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import { ScopedIntrospectionPreset } from 'graphile-scoped-introspection';
import { makePgService as makeConstructivePgService } from 'graphile-settings';
import { BuildStateRetirementPlugin } from 'graphile-settings/plugins';
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
  retireBuildState?: boolean;
  schemas: string[];
}

let capturedBuild: GraphileBuild.BuildBase | undefined;

const PerformanceHarnessBuildCapturePlugin: GraphileConfig.Plugin = {
  name: 'PerformanceHarnessBuildCapturePlugin',
  schema: {
    hooks: {
      build(build) {
        capturedBuild = build;
        return build;
      },
    },
  },
};

declare global {
  namespace GraphileConfig {
    interface Plugins {
      PerformanceHarnessBuildCapturePlugin: true;
    }
  }
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
  if (
    config.retireBuildState !== undefined &&
    typeof config.retireBuildState !== 'boolean'
  ) {
    throw new Error(
      'scoped introspection worker retireBuildState must be a boolean'
    );
  }
  return {
    mode: config.mode,
    retireBuildState: config.retireBuildState ?? false,
    schemas: config.schemas,
  };
};

const getBuildState = (): 'released' | 'retained' => {
  if (!capturedBuild) throw new Error('benchmark build was not captured');
  try {
    void capturedBuild.input;
    return 'retained';
  } catch (error) {
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code ===
        'GRAPHILE_BUILD_STATE_RELEASED'
    ) {
      return 'released';
    }
    throw error;
  }
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
    const scopedServiceOptions = {
      ...serviceOptions,
      introspectionMode: 'scoped-required' as const,
      introspectionScopedCatalogTypes: 'dependency-closure' as const,
    };
    const service =
      config.mode === 'stock'
        ? makePostGraphilePgService(serviceOptions)
        : makeConstructivePgService(scopedServiceOptions);
    release = async () => {
      await service.release();
    };

    const result = await measureBenchmarkCase(
      caseName,
      async () => {
        capturedBuild = undefined;
        return makeSchema({
          extends: [
            graphileBuildPreset,
            graphileBuildPgPreset,
            ...(config.mode === 'scoped' ? [ScopedIntrospectionPreset] : []),
          ],
          plugins: [
            PerformanceHarnessBuildCapturePlugin,
            ...(config.retireBuildState ? [BuildStateRetirementPlugin] : []),
          ],
          pgServices: [service],
        });
      },
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
        const buildState = getBuildState();
        const expectedBuildState = config.retireBuildState
          ? 'released'
          : 'retained';
        const caseValidationErrors: string[] = [];
        if (buildState !== expectedBuildState) {
          caseValidationErrors.push(
            `expected build state ${expectedBuildState}, received ${buildState}`
          );
        }
        const schemaText = printSchema(lexicographicSortSchema(schema));
        return {
          schemaHash: createHash('sha256').update(schemaText).digest('hex'),
          schemaTypeCount: Object.keys(schema.getTypeMap()).length,
          runtimeVerified: true as const,
          caseValidation: {
            passed: caseValidationErrors.length === 0,
            errors: caseValidationErrors,
          },
          metadata: { buildState, introspectionMode: config.mode },
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
