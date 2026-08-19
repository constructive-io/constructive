import { makeScopedIntrospectionSuite } from '../src/scoped-introspection-suite';

describe('scoped introspection benchmark registration', () => {
  it('adds two schema-equivalent cases through the generic suite API', () => {
    expect(
      makeScopedIntrospectionSuite({ schemas: ['cperf_example'] })
    ).toEqual({
      name: 'scoped-introspection-jit-off',
      cases: [
        {
          name: 'stock',
          workerConfig: {
            scopedIntrospection: false,
            schemas: ['cperf_example'],
            allowedDependencySchemas: [],
            noiseSchemas: [],
            introspectionJit: false,
          },
          expectedSchemaGroup: 'introspection-equivalence',
        },
        {
          name: 'scoped',
          workerConfig: {
            scopedIntrospection: true,
            schemas: ['cperf_example'],
            allowedDependencySchemas: [],
            noiseSchemas: [],
            introspectionJit: false,
          },
          expectedSchemaGroup: 'introspection-equivalence',
        },
      ],
    });
  });

  it('keeps JIT and dependency/noise configuration identical across arms', () => {
    const suite = makeScopedIntrospectionSuite({
      schemas: ['cperf_root'],
      allowedDependencySchemas: ['cperf_dep'],
      noiseSchemas: ['cperf_noise'],
      introspectionJit: true,
    });
    expect(suite.name).toBe('scoped-introspection-jit-on');
    expect(suite.cases.map((item) => item.workerConfig)).toEqual([
      {
        scopedIntrospection: false,
        schemas: ['cperf_root'],
        allowedDependencySchemas: ['cperf_dep'],
        noiseSchemas: ['cperf_noise'],
        introspectionJit: true,
      },
      {
        scopedIntrospection: true,
        schemas: ['cperf_root'],
        allowedDependencySchemas: ['cperf_dep'],
        noiseSchemas: ['cperf_noise'],
        introspectionJit: true,
      },
    ]);
  });
});
