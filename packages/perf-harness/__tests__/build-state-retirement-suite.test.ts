import { makeBuildStateRetirementSuite } from '../src/build-state-retirement-suite';

describe('build-state retirement benchmark registration', () => {
  it('adds four schema-equivalent attribution cases through the generic suite API', () => {
    const suite = makeBuildStateRetirementSuite({
      schemas: ['cperf_example'],
    });

    expect(suite.name).toBe('scoped-introspection-and-build-state-retirement');
    expect(suite.cases.map(({ name }) => name)).toEqual([
      'stock',
      'scoped',
      'retire',
      'scoped-retire',
    ]);
    expect(suite.cases.map(({ workerConfig }) => workerConfig)).toEqual([
      {
        mode: 'stock',
        retireBuildState: false,
        schemas: ['cperf_example'],
      },
      {
        mode: 'scoped',
        retireBuildState: false,
        schemas: ['cperf_example'],
      },
      {
        mode: 'stock',
        retireBuildState: true,
        schemas: ['cperf_example'],
      },
      {
        mode: 'scoped',
        retireBuildState: true,
        schemas: ['cperf_example'],
      },
    ]);
    expect(
      new Set(suite.cases.map(({ expectedSchemaGroup }) => expectedSchemaGroup))
    ).toEqual(new Set(['retirement-equivalence']));
  });
});
