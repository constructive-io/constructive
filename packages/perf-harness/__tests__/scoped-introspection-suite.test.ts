import { makeScopedIntrospectionSuite } from '../src/scoped-introspection-suite';

describe('scoped introspection benchmark registration', () => {
  it('adds two schema-equivalent cases through the generic suite API', () => {
    expect(
      makeScopedIntrospectionSuite({ schemas: ['cperf_example'] })
    ).toEqual({
      name: 'scoped-introspection',
      cases: [
        {
          name: 'stock',
          workerConfig: {
            scopedIntrospection: false,
            schemas: ['cperf_example'],
          },
          expectedSchemaGroup: 'introspection-equivalence',
        },
        {
          name: 'scoped',
          workerConfig: {
            scopedIntrospection: true,
            schemas: ['cperf_example'],
          },
          expectedSchemaGroup: 'introspection-equivalence',
        },
      ],
    });
  });
});
