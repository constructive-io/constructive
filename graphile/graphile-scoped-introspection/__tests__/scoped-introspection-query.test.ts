import { makeSchemaScopedIntrospectionQuery } from '../src/upstream/pg-introspection';

describe('CNC-owned scoped introspection SQL', () => {
  it('keeps schema and capability input in parameters', () => {
    const schema = "tenant_a'); drop schema public; --";
    const capability = "pg_trgm'); select pg_sleep(10); --";
    const query = makeSchemaScopedIntrospectionQuery(
      [schema, 'tenant_a', schema],
      { capabilityExtensions: [capability, 'pg_trgm', capability] }
    );

    expect(query.text).toContain('pg_catalog.unnest($1::text[])');
    expect(query.text).toContain('pg_catalog.unnest($2::text[])');
    expect(query.text).not.toContain(schema);
    expect(query.text).not.toContain(capability);
    expect(query.values).toEqual([
      [schema, 'tenant_a'],
      [capability, 'pg_trgm'],
    ]);
  });

  it('rejects empty, system, NUL, and malformed capability inputs', () => {
    expect(() => makeSchemaScopedIntrospectionQuery([])).toThrow(
      'requires at least one schema'
    );
    expect(() => makeSchemaScopedIntrospectionQuery(['pg_catalog'])).toThrow(
      "cannot expose system schema 'pg_catalog'"
    );
    expect(() =>
      makeSchemaScopedIntrospectionQuery(['information_schema'])
    ).toThrow("cannot expose system schema 'information_schema'");
    expect(() => makeSchemaScopedIntrospectionQuery(['tenant\0a'])).toThrow(
      'must not contain NUL bytes'
    );
    expect(() =>
      makeSchemaScopedIntrospectionQuery(['tenant_a'], {
        capabilityExtensions: [' pg_trgm'],
      })
    ).toThrow('must contain exact non-empty extension names');
  });

  it('keeps recursive dependency closure and both catalog type policies', () => {
    const all = makeSchemaScopedIntrospectionQuery(['tenant_a']);
    const closure = makeSchemaScopedIntrospectionQuery(['tenant_a'], {
      catalogTypes: 'dependency-closure',
    });

    for (const query of [all, closure]) {
      expect(query.text).toContain('with\nrecursive');
      expect(query.text).toContain(
        'object_closure(object_class, object_id) as'
      );
      expect(query.text).toContain('retained_index_support_objects');
      expect(query.text).toContain('installed_extensions');
      expect(query.text).toContain('select pg_language.oid as _id');
      expect(query.text).toContain('select pg_am.oid as _id');
    }
    expect(all.text).toContain(
      "or pg_type.typnamespace = 'pg_catalog'::regnamespace"
    );
    expect(closure.text).not.toContain(
      "or pg_type.typnamespace = 'pg_catalog'::regnamespace"
    );
  });

  it('rejects unknown options at the runtime boundary', () => {
    expect(() =>
      makeSchemaScopedIntrospectionQuery(['tenant_a'], {
        unexpected: true,
      } as never)
    ).toThrow('Unsupported schema-scoped introspection option(s): unexpected');
  });
});
