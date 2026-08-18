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
      workerConfig: { scopedIntrospection: false, schemas: options.schemas },
      expectedSchemaGroup: 'introspection-equivalence',
    },
    {
      name: 'scoped',
      workerConfig: { scopedIntrospection: true, schemas: options.schemas },
      expectedSchemaGroup: 'introspection-equivalence',
    },
  ],
});
