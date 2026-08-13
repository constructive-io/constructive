import {
  normalizeIntrospectionDependencySchemas,
  resolveIntrospectionSettings,
} from '../src/introspection-settings';

describe('resolveIntrospectionSettings', () => {
  it('disables JIT only for scoped introspection', () => {
    const scoped = resolveIntrospectionSettings('scoped-required', {
      statement_timeout: '5000',
      jit: 'on',
      work_mem: '16MB',
    });
    const stock = resolveIntrospectionSettings('stock', {
      statement_timeout: '5000',
    });
    const defaultBound = resolveIntrospectionSettings('stock', undefined);

    expect(scoped).toEqual({
      statement_timeout: '5000',
      jit: 'off',
      work_mem: '512kB',
    });
    expect(stock).toEqual({ statement_timeout: '5000' });
    expect(defaultBound).toEqual({ statement_timeout: '120s' });
  });
});

describe('normalizeIntrospectionDependencySchemas', () => {
  it('preserves lookup order while trimming and deduplicating', () => {
    expect(
      normalizeIntrospectionDependencySchemas([
        ' extensions ',
        'shared_api',
        'extensions',
      ])
    ).toEqual(['extensions', 'shared_api']);
  });

  it.each(['pg_catalog', 'pg_toast', 'information_schema'])(
    'rejects system dependency schema %s',
    (schema) => {
      expect(() => normalizeIntrospectionDependencySchemas([schema])).toThrow(
        'must not be a system schema'
      );
    }
  );
});
