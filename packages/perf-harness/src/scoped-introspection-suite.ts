import type { BenchmarkSuiteDefinition } from './types';

export interface ScopedIntrospectionSuiteOptions {
  schemas: string[];
}

/** Register the stock/scoped cases without teaching the core runner their names. */
export const makeScopedIntrospectionSuite = (
  options: ScopedIntrospectionSuiteOptions
): BenchmarkSuiteDefinition => ({
  name: 'scoped-introspection',
  cases: [
    {
      name: 'stock',
      workerConfig: { mode: 'stock', schemas: options.schemas },
      expectedSchemaGroup: 'introspection-equivalence',
    },
    {
      name: 'scoped',
      workerConfig: { mode: 'scoped', schemas: options.schemas },
      expectedSchemaGroup: 'introspection-equivalence',
    },
  ],
});
