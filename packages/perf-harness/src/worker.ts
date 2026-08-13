import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import { BuildStateRetirementPlugin } from 'graphile-settings/plugins/build-state-retirement';
import { execute, lexicographicSortSchema, parse, printSchema } from 'graphql';
import { makePgService as makePostGraphilePgService } from 'postgraphile/adaptors/pg';

import {
  DATABASE_URL_ENV,
  WORKER_CONFIG_ENV,
  WORKER_RESULT_PREFIX,
} from './process';
import {
  ARM_DEFINITIONS,
  type ArmName,
  type MemorySnapshot,
  type SuccessfulWorkerResult,
  type WorkerConfig,
  type WorkerResult,
} from './types';

const gc = (): void => {
  if (typeof global.gc !== 'function') {
    throw new Error('benchmark worker requires Node --expose-gc');
  }
  global.gc();
  global.gc();
  global.gc();
};

const memorySnapshot = (): MemorySnapshot => {
  const memory = process.memoryUsage();
  return {
    rss: memory.rss,
    heapTotal: memory.heapTotal,
    heapUsed: memory.heapUsed,
    external: memory.external,
    arrayBuffers: memory.arrayBuffers,
  };
};

const memoryDelta = (
  baseline: MemorySnapshot,
  afterBuild: MemorySnapshot
): MemorySnapshot => ({
  rss: afterBuild.rss - baseline.rss,
  heapTotal: afterBuild.heapTotal - baseline.heapTotal,
  heapUsed: afterBuild.heapUsed - baseline.heapUsed,
  external: afterBuild.external - baseline.external,
  arrayBuffers: afterBuild.arrayBuffers - baseline.arrayBuffers,
});

const stringArray = (value: unknown, name: string): string[] => {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (item) =>
        typeof item !== 'string' ||
        item.trim() !== item ||
        item.length === 0 ||
        item.includes('\0')
    )
  ) {
    throw new Error(`${name} must contain exact non-empty strings`);
  }
  return [...new Set(value)];
};

export const parseWorkerConfig = (encoded: string | undefined): WorkerConfig => {
  if (!encoded) throw new Error(`${WORKER_CONFIG_ENV} is required`);
  const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
    arm?: unknown;
    schemas?: unknown;
    allowedDependencySchemas?: unknown;
  };
  if (typeof value.arm !== 'string' || !(value.arm in ARM_DEFINITIONS)) {
    throw new Error('worker arm is invalid');
  }
  const schemas = stringArray(value.schemas, 'schemas');
  const allowedDependencySchemas =
    value.allowedDependencySchemas === undefined
      ? []
      : stringArrayOrEmpty(
        value.allowedDependencySchemas,
        'allowedDependencySchemas'
      );
  return {
    arm: value.arm as ArmName,
    schemas,
    allowedDependencySchemas,
  };
};

const stringArrayOrEmpty = (value: unknown, name: string): string[] => {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  if (value.length === 0) return [];
  return stringArray(value, name);
};

const CaptureBuildPlugin = (
  capture: (build: GraphileBuild.Build) => void
): GraphileConfig.Plugin => ({
  name: 'CperfCaptureBuildPlugin',
  schema: {
    hooks: {
      build(build) {
        // The build hook type models the object while it is being assembled; by
        // the time this hook returns Graphile completes it into Build.
        capture(build as GraphileBuild.Build);
        return build;
      },
    },
  },
});

export const makeWorkerPreset = (
  config: WorkerConfig,
  databaseUrl: string,
  capture: (build: GraphileBuild.Build) => void
): { preset: GraphileConfig.Preset; release: () => Promise<void> } => {
  const definition = ARM_DEFINITIONS[config.arm];
  const service = Object.assign(
    makePostGraphilePgService({
      connectionString: databaseUrl,
      schemas: config.schemas,
      pubsub: false,
      pgSettingsForIntrospection: definition.scopedIntrospection
        ? {
          statement_timeout: '120s',
          jit: 'off',
          work_mem: '512kB',
        }
        : { statement_timeout: '120s' },
    }),
    {
      introspectionMode: definition.introspectionMode,
      introspectionClientReleaseMode:
        definition.introspectionClientReleaseMode,
      ...(definition.scopedCatalogTypes
        ? { introspectionScopedCatalogTypes: definition.scopedCatalogTypes }
        : {}),
      introspectionAllowedDependencySchemas: config.allowedDependencySchemas,
    }
  );
  const plugins: GraphileConfig.Plugin[] = [CaptureBuildPlugin(capture)];
  if (definition.retireBuildState) plugins.push(BuildStateRetirementPlugin);
  return {
    preset: {
      extends: [graphileBuildPreset, graphileBuildPgPreset],
      plugins,
      pgServices: [service],
    },
    release: async () => {
      await service.release();
    },
  };
};

const buildStateWasReleased = (build: GraphileBuild.Build): boolean => {
  try {
    void build.input;
    return false;
  } catch (error) {
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code ===
        'GRAPHILE_BUILD_STATE_RELEASED'
    ) {
      return true;
    }
    throw error;
  }
};

export const runWorker = async (
  config: WorkerConfig,
  databaseUrl: string
): Promise<SuccessfulWorkerResult> => {
  const definition = ARM_DEFINITIONS[config.arm];
  let capturedBuild: GraphileBuild.Build | undefined;
  const { preset, release } = makeWorkerPreset(
    config,
    databaseUrl,
    (build) => {
      capturedBuild = build;
    }
  );
  try {
    gc();
    const baseline = memorySnapshot();
    const startedAt = performance.now();
    const { schema } = await makeSchema(preset);
    const buildMs = performance.now() - startedAt;
    if (!capturedBuild) throw new Error('capture plugin did not observe a build');
    const buildStateReleased = buildStateWasReleased(capturedBuild);
    if (buildStateReleased !== definition.retireBuildState) {
      throw new Error(
        `build-state lifecycle mismatch: expected released=${String(
          definition.retireBuildState
        )}, observed released=${String(buildStateReleased)}`
      );
    }
    const queryResult = await execute({
      schema,
      document: parse('{ __typename }'),
    });
    if (queryResult.errors?.length || queryResult.data?.__typename !== 'Query') {
      throw new Error(
        `schema verification query failed: ${queryResult.errors
          ?.map((error) => error.message)
          .join('; ')}`
      );
    }
    const schemaText = printSchema(lexicographicSortSchema(schema));
    const schemaHash = createHash('sha256').update(schemaText).digest('hex');
    gc();
    const afterBuild = memorySnapshot();
    return {
      status: 'ok',
      pid: process.pid,
      arm: config.arm,
      definition,
      buildMs,
      schemaHash,
      schemaTypeCount: Object.keys(schema.getTypeMap()).length,
      queryVerified: true,
      buildStateReleased,
      memory: {
        baseline,
        afterBuild,
        delta: memoryDelta(baseline, afterBuild),
        // Node reports resourceUsage().maxRSS in KiB on supported platforms.
        processPeakRss: process.resourceUsage().maxRSS * 1024,
      },
    };
  } finally {
    await release();
  }
};

const safeError = (error: unknown, databaseUrl: string): string => {
  const message = error instanceof Error ? error.message : String(error);
  return databaseUrl
    ? message.replaceAll(databaseUrl, '<redacted database URL>')
    : message;
};

export const workerMain = async (): Promise<void> => {
  let arm: ArmName = 'stock';
  const databaseUrl = process.env[DATABASE_URL_ENV] ?? '';
  let result: WorkerResult;
  try {
    if (!databaseUrl) throw new Error(`${DATABASE_URL_ENV} is required`);
    const config = parseWorkerConfig(process.env[WORKER_CONFIG_ENV]);
    arm = config.arm;
    result = await runWorker(config, databaseUrl);
  } catch (error) {
    result = {
      status: 'error',
      pid: process.pid,
      arm,
      error: safeError(error, databaseUrl),
    };
    process.exitCode = 1;
  }
  process.stdout.write(`${WORKER_RESULT_PREFIX}${JSON.stringify(result)}\n`);
};

if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  void workerMain();
}
