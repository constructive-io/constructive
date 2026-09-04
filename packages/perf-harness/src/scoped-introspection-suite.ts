import type { BenchmarkSuiteDefinition } from './types';

export interface ScopedIntrospectionSuiteOptions {
  schemas: string[];
  allowedDependencySchemas?: string[];
  noiseSchemas?: string[];
  introspectionJit?: boolean;
}

/** Register the stock/scoped cases without teaching the core runner their names. */
export const makeScopedIntrospectionSuite = (
  options: ScopedIntrospectionSuiteOptions
): BenchmarkSuiteDefinition => {
  const workerConfig = {
    schemas: options.schemas,
    allowedDependencySchemas: options.allowedDependencySchemas ?? [],
    noiseSchemas: options.noiseSchemas ?? [],
    introspectionJit: options.introspectionJit ?? false,
  };
  return {
    name: `scoped-introspection-jit-${workerConfig.introspectionJit ? 'on' : 'off'}`,
    cases: [
      {
        name: 'stock',
        workerConfig: { ...workerConfig, scopedIntrospection: false },
        expectedSchemaGroup: 'introspection-equivalence',
      },
      {
        name: 'scoped',
        workerConfig: { ...workerConfig, scopedIntrospection: true },
        expectedSchemaGroup: 'introspection-equivalence',
      },
    ],
  };
};

export const makeScopedIntrospectionQuerySuite = (
  options: ScopedIntrospectionSuiteOptions
): BenchmarkSuiteDefinition => {
  const workerConfig = {
    schemas: options.schemas,
    allowedDependencySchemas: options.allowedDependencySchemas ?? [],
    noiseSchemas: options.noiseSchemas ?? [],
    introspectionJit: options.introspectionJit ?? false,
  };
  return {
    name: `scoped-introspection-query-jit-${workerConfig.introspectionJit ? 'on' : 'off'}`,
    cases: [
      {
        name: 'stock',
        workerConfig: { ...workerConfig, scopedIntrospection: false },
      },
      {
        name: 'scoped',
        workerConfig: { ...workerConfig, scopedIntrospection: true },
      },
    ],
  };
};
