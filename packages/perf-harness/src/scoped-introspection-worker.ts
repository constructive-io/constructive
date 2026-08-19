import { createHash } from 'node:crypto';

import { withPgClientFromPgService } from '@dataplan/pg';
import {
  defaultPreset as graphileBuildPreset,
  makeSchema,
} from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import {
  type Introspection,
  ScopedIntrospectionPreset,
} from 'graphile-scoped-introspection';
import { makeScopedPgService } from 'graphile-settings';
import { execute, lexicographicSortSchema, parse, printSchema } from 'graphql';
import { makePgService as makePostGraphilePgService } from 'postgraphile/adaptors/pg';

import { measureBenchmarkCase } from './metrics';
import {
  parseWorkerProcessArgs,
  redactSecret,
  writeWorkerResult,
} from './process';

interface ScopedWorkerConfig {
  scopedIntrospection: boolean;
  introspectionJit: boolean;
  schemas: string[];
  allowedDependencySchemas: string[];
  noiseSchemas: string[];
}

const stringArray = (value: unknown, name: string, allowEmpty: boolean) => {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw new Error(
      `scoped introspection worker requires ${allowEmpty ? 'a' : 'a non-empty'} ${name} array`
    );
  }
  return value as string[];
};

const validateConfig = (value: unknown): ScopedWorkerConfig => {
  const config = value as Partial<ScopedWorkerConfig>;
  if (typeof config.scopedIntrospection !== 'boolean') {
    throw new Error(
      'scoped introspection worker requires a scopedIntrospection boolean'
    );
  }
  if (typeof config.introspectionJit !== 'boolean') {
    throw new Error('scoped introspection worker requires an introspectionJit boolean');
  }
  return {
    scopedIntrospection: config.scopedIntrospection,
    introspectionJit: config.introspectionJit,
    schemas: stringArray(config.schemas, 'schemas', false),
    allowedDependencySchemas: stringArray(
      config.allowedDependencySchemas,
      'allowedDependencySchemas',
      true
    ),
    noiseSchemas: stringArray(config.noiseSchemas, 'noiseSchemas', true),
  };
};

const entityCounts = (introspection: Introspection) => ({
  namespaces: introspection.namespaces.length,
  classes: introspection.classes.length,
  attributes: introspection.attributes.length,
  procedures: introspection.procs.length,
  types: introspection.types.length,
  constraints: introspection.constraints.length,
  indexes: introspection.indexes.length,
  ranges: introspection.ranges.length,
  extensions: introspection.extensions.length,
});

const makeCapturePlugin = (
  capture: (introspection: Introspection) => void
): GraphileConfig.Plugin =>
  ({
    name: 'ScopedIntrospectionBenchmarkCapturePlugin',
    gather: {
      namespace: 'scopedIntrospectionBenchmarkCapture',
      hooks: {
        pgIntrospection_introspection(
          _info: unknown,
          event: { introspection: unknown }
        ) {
          capture(event.introspection as unknown as Introspection);
        },
      },
    },
  }) as unknown as GraphileConfig.Plugin;

const main = async (): Promise<void> => {
  let databaseUrl = '';
  let caseName = 'unknown';
  let release: (() => Promise<void>) | null = null;
  try {
    const workerArgs = parseWorkerProcessArgs(process.argv.slice(2));
    databaseUrl = workerArgs.databaseUrl;
    const { envelope } = workerArgs;
    caseName = envelope.caseName;
    const config = validateConfig(envelope.workerConfig);
    let introspection: Introspection | undefined;
    const expectedJit = config.introspectionJit ? 'on' : 'off';
    const serviceOptions = {
      connectionString: databaseUrl,
      schemas: config.schemas,
      pubsub: false,
    };
    const scopedServiceOptions = {
      ...serviceOptions,
      introspectionScopedCatalogTypes: 'dependency-closure' as const,
      introspectionAllowedDependencySchemas: config.allowedDependencySchemas,
      introspectionJit: config.introspectionJit,
    };
    const service =
      config.scopedIntrospection
        ? makeScopedPgService(scopedServiceOptions)
        : makePostGraphilePgService({
          ...serviceOptions,
          pgSettingsForIntrospection: { jit: expectedJit },
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
            ...(config.scopedIntrospection
              ? [ScopedIntrospectionPreset]
              : []),
          ],
          plugins: [
            makeCapturePlugin((value) => {
              introspection = value;
            }),
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
        if (!introspection) {
          throw new Error('introspection lifecycle event was not emitted');
        }
        const actualJit = await withPgClientFromPgService(
          service,
          service.pgSettingsForIntrospection ?? null,
          async (client) => {
            const setting = await client.query<{ jit: string }>({
              text: 'show jit',
            });
            return setting.rows[0]?.jit;
          }
        );
        const namespaceNames = introspection.namespaces.map(
          (namespace) => namespace.nspname
        );
        const validationErrors = [
          ...config.schemas
            .filter((schemaName) => !namespaceNames.includes(schemaName))
            .map((schemaName) => `missing root schema '${schemaName}'`),
          ...config.allowedDependencySchemas
            .filter((schemaName) => !namespaceNames.includes(schemaName))
            .map((schemaName) => `missing dependency schema '${schemaName}'`),
          ...(config.scopedIntrospection
            ? config.noiseSchemas
              .filter((schemaName) => namespaceNames.includes(schemaName))
              .map((schemaName) => `retained noise schema '${schemaName}'`)
            : []),
          ...(actualJit === expectedJit
            ? []
            : [`expected introspection JIT '${expectedJit}', received '${String(actualJit)}'`]),
        ];
        const schemaText = printSchema(lexicographicSortSchema(schema));
        return {
          schemaHash: createHash('sha256').update(schemaText).digest('hex'),
          schemaTypeCount: Object.keys(schema.getTypeMap()).length,
          runtimeVerified: true as const,
          caseValidation: {
            passed: validationErrors.length === 0,
            errors: validationErrors,
          },
          metadata: {
            scopedIntrospection: config.scopedIntrospection,
            introspectionJit: config.introspectionJit,
            actualJit: actualJit ?? 'unavailable',
            introspectionEntityCounts: entityCounts(introspection),
            introspectionNamespaces: namespaceNames,
          },
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
