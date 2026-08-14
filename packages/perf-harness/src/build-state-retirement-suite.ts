import type { BenchmarkSuiteDefinition } from './types';

export interface BuildStateRetirementSuiteOptions {
  schemas: string[];
}

/** Register the four attribution cases without loading ConstructivePreset. */
export const makeBuildStateRetirementSuite = (
  options: BuildStateRetirementSuiteOptions
): BenchmarkSuiteDefinition => ({
  name: 'scoped-introspection-and-build-state-retirement',
  cases: [
    {
      name: 'stock',
      workerConfig: {
        mode: 'stock',
        retireBuildState: false,
        schemas: options.schemas,
      },
      expectedSchemaGroup: 'retirement-equivalence',
    },
    {
      name: 'scoped',
      workerConfig: {
        mode: 'scoped',
        retireBuildState: false,
        schemas: options.schemas,
      },
      expectedSchemaGroup: 'retirement-equivalence',
    },
    {
      name: 'retire',
      workerConfig: {
        mode: 'stock',
        retireBuildState: true,
        schemas: options.schemas,
      },
      expectedSchemaGroup: 'retirement-equivalence',
    },
    {
      name: 'scoped-retire',
      workerConfig: {
        mode: 'scoped',
        retireBuildState: true,
        schemas: options.schemas,
      },
      expectedSchemaGroup: 'retirement-equivalence',
    },
  ],
});
