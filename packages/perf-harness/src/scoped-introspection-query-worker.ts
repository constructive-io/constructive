import { createHash } from 'node:crypto';

import {
  makeIntrospectionQuery,
  makeSchemaScopedIntrospectionQuery,
} from 'graphile-scoped-introspection';
import { Pool } from 'pg';

import { measureBenchmarkCase } from './metrics';
import {
  parseWorkerProcessArgs,
  redactSecret,
  writeWorkerResult,
} from './process';

interface QueryWorkerConfig {
  scopedIntrospection: boolean;
  introspectionJit: boolean;
  schemas: string[];
  allowedDependencySchemas: string[];
  noiseSchemas: string[];
}

interface IntrospectionEntityCounts {
  [key: string]: number;
  namespaces: number;
  classes: number;
  attributes: number;
  procedures: number;
  types: number;
  constraints: number;
  indexes: number;
  ranges: number;
  extensions: number;
}

const stringArray = (value: unknown, name: string, allowEmpty: boolean) => {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw new Error(
      `scoped query worker requires ${allowEmpty ? 'a' : 'a non-empty'} ${name} array`
    );
  }
  return value as string[];
};

export const validateQueryWorkerConfig = (
  value: unknown
): QueryWorkerConfig => {
  const config = value as Partial<QueryWorkerConfig>;
  if (typeof config.scopedIntrospection !== 'boolean') {
    throw new Error('scoped query worker requires a scopedIntrospection boolean');
  }
  if (typeof config.introspectionJit !== 'boolean') {
    throw new Error('scoped query worker requires an introspectionJit boolean');
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

const countArray = (
  value: Record<string, unknown>,
  key: string
): number => {
  const items = value[key];
  if (!Array.isArray(items)) {
    throw new Error(`introspection query result field '${key}' is not an array`);
  }
  return items.length;
};

export const parseIntrospectionEntityCounts = (
  value: unknown
): IntrospectionEntityCounts => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('introspection query result is not an object');
  }
  const result = value as Record<string, unknown>;
  return {
    namespaces: countArray(result, 'namespaces'),
    classes: countArray(result, 'classes'),
    attributes: countArray(result, 'attributes'),
    procedures: countArray(result, 'procs'),
    types: countArray(result, 'types'),
    constraints: countArray(result, 'constraints'),
    indexes: countArray(result, 'indexes'),
    ranges: countArray(result, 'ranges'),
    extensions: countArray(result, 'extensions'),
  };
};

const namespaceNames = (value: unknown): string[] => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('introspection query result is not an object');
  }
  const namespaces = (value as Record<string, unknown>).namespaces;
  if (!Array.isArray(namespaces)) {
    throw new Error("introspection query result field 'namespaces' is not an array");
  }
  return namespaces.map((namespace) => {
    if (
      typeof namespace !== 'object' ||
      namespace === null ||
      Array.isArray(namespace) ||
      typeof (namespace as Record<string, unknown>).nspname !== 'string'
    ) {
      throw new Error('introspection namespace result is invalid');
    }
    return (namespace as Record<string, string>).nspname;
  });
};

const main = async (): Promise<void> => {
  let databaseUrl = '';
  let caseName = 'unknown';
  let pool: Pool | undefined;
  try {
    const workerArgs = parseWorkerProcessArgs(process.argv.slice(2));
    databaseUrl = workerArgs.databaseUrl;
    caseName = workerArgs.envelope.caseName;
    const config = validateQueryWorkerConfig(
      workerArgs.envelope.workerConfig
    );
    const query = config.scopedIntrospection
      ? makeSchemaScopedIntrospectionQuery(config.schemas, {
        catalogTypes: 'dependency-closure',
      })
      : { text: makeIntrospectionQuery(), values: [] as unknown[] };
    const expectedJit = config.introspectionJit ? 'on' : 'off';
    pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`set local jit to ${expectedJit}`);
      const setting = await client.query<{ jit: string }>('show jit');
      const actualJit = setting.rows[0]?.jit;
      const result = await measureBenchmarkCase(
        caseName,
        async () => {
          const response = await client.query<{ introspection: string }>(query);
          const introspectionText = response.rows[0]?.introspection;
          if (typeof introspectionText !== 'string') {
            throw new Error('introspection query did not return JSON text');
          }
          return introspectionText;
        },
        async (introspectionText) => {
          const parsed: unknown = JSON.parse(introspectionText);
          const names = namespaceNames(parsed);
          const validationErrors = [
            ...config.schemas
              .filter((schemaName) => !names.includes(schemaName))
              .map((schemaName) => `missing root schema '${schemaName}'`),
            ...config.allowedDependencySchemas
              .filter((schemaName) => !names.includes(schemaName))
              .map((schemaName) => `missing dependency schema '${schemaName}'`),
            ...(config.scopedIntrospection
              ? config.noiseSchemas
                .filter((schemaName) => names.includes(schemaName))
                .map((schemaName) => `retained noise schema '${schemaName}'`)
              : []),
            ...(actualJit === expectedJit
              ? []
              : [`expected introspection JIT '${expectedJit}', received '${String(actualJit)}'`]),
          ];
          const counts = parseIntrospectionEntityCounts(parsed);
          return {
            schemaHash: createHash('sha256')
              .update(introspectionText)
              .digest('hex'),
            schemaTypeCount: counts.types,
            runtimeVerified: true as const,
            caseValidation: {
              passed: validationErrors.length === 0,
              errors: validationErrors,
            },
            metadata: {
              scopedIntrospection: config.scopedIntrospection,
              introspectionJit: config.introspectionJit,
              actualJit: actualJit ?? 'unavailable',
              catalogWarmth: 'shared-server-not-reset',
              payloadBytes: Buffer.byteLength(introspectionText, 'utf8'),
              bindParameterCount: query.values.length,
              introspectionEntityCounts: counts,
              introspectionNamespaces: names,
            },
          };
        }
      );
      await client.query('rollback');
      writeWorkerResult(result);
    } finally {
      client.release();
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
  } finally {
    await pool?.end();
  }
};

if (require.main === module) void main();
