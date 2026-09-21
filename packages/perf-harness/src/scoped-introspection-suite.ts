import type { BenchmarkSuiteDefinition, JsonValue } from './types';

export interface ScopedIntrospectionSuiteOptions {
  schemas: string[];
  runtimeCheck?: { query: string; expectedData: JsonValue };
}

/** Register the stock/scoped cases without teaching the core runner their names. */
export const makeScopedIntrospectionSuite = (
  options: ScopedIntrospectionSuiteOptions
): BenchmarkSuiteDefinition => ({
  name: 'scoped-introspection',
  cases: [
    {
      name: 'stock',
      workerConfig: {
        mode: 'stock',
        schemas: options.schemas,
        ...(options.runtimeCheck ? { runtimeCheck: options.runtimeCheck } : {}),
      },
      expectedSchemaGroup: 'introspection-equivalence',
    },
    {
      name: 'scoped',
      workerConfig: {
        mode: 'scoped',
        schemas: options.schemas,
        ...(options.runtimeCheck ? { runtimeCheck: options.runtimeCheck } : {}),
      },
      expectedSchemaGroup: 'introspection-equivalence',
    },
  ],
});
