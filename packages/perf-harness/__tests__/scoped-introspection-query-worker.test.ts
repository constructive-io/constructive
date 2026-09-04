import {
  parseIntrospectionEntityCounts,
  validateQueryWorkerConfig,
} from '../src/scoped-introspection-query-worker';

describe('scoped query diagnostic boundaries', () => {
  it('validates the JSON worker configuration once', () => {
    expect(
      validateQueryWorkerConfig({
        scopedIntrospection: true,
        introspectionJit: false,
        schemas: ['cperf_root'],
        allowedDependencySchemas: ['cperf_dep'],
        noiseSchemas: ['cperf_noise'],
      })
    ).toEqual({
      scopedIntrospection: true,
      introspectionJit: false,
      schemas: ['cperf_root'],
      allowedDependencySchemas: ['cperf_dep'],
      noiseSchemas: ['cperf_noise'],
    });
    expect(() =>
      validateQueryWorkerConfig({
        scopedIntrospection: true,
        introspectionJit: 'off',
        schemas: ['cperf_root'],
        allowedDependencySchemas: [],
        noiseSchemas: [],
      })
    ).toThrow('introspectionJit boolean');
  });

  it('counts the public top-level introspection arrays', () => {
    expect(
      parseIntrospectionEntityCounts({
        namespaces: [{}, {}],
        classes: [{}],
        attributes: [{}, {}, {}],
        procs: [],
        types: [{}, {}],
        constraints: [{}],
        indexes: [{}],
        ranges: [],
        extensions: [{}],
      })
    ).toEqual({
      namespaces: 2,
      classes: 1,
      attributes: 3,
      procedures: 0,
      types: 2,
      constraints: 1,
      indexes: 1,
      ranges: 0,
      extensions: 1,
    });
    expect(() => parseIntrospectionEntityCounts({ namespaces: null })).toThrow(
      "field 'namespaces' is not an array"
    );
  });
});
