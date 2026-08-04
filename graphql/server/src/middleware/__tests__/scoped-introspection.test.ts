import { createHash } from 'node:crypto';

import {
  makeIntrospectionQuery,
  makeSchemaScopedIntrospectionQuery
} from 'pg-introspection';

const makeScopedQueryWithCatalogTypes = makeSchemaScopedIntrospectionQuery as unknown as (
  schemas: readonly string[],
  options?: {
    catalogTypes?: 'all' | 'dependency-closure';
    capabilityExtensions?: readonly string[];
  }
) => ReturnType<typeof makeSchemaScopedIntrospectionQuery>;

describe('schema-scoped PostgreSQL introspection', () => {
  it('preserves the stock query byte for byte', () => {
    const stock = makeIntrospectionQuery();
    expect(stock).toHaveLength(7332);
    expect(createHash('sha256').update(stock).digest('hex')).toBe(
      'c0ed817b912f78e1ea68c70d89ff4b7f9cb4c02d88112a69ac4109d5b996e4c5'
    );
  });

  it('keeps schema names in bind values and includes dependency closure', () => {
    const schemas = ['tenant_a', "tenant_'quoted", 'tenant_a'];
    const query = makeSchemaScopedIntrospectionQuery(schemas);

    expect(query.values).toEqual([['tenant_a', "tenant_'quoted"], []]);
    expect(query.text).toContain('$1::text[]');
    expect(query.text).toContain('$2::text[]');
    expect(query.text).not.toContain('tenant_a');
    expect(query.text).not.toContain("tenant_'quoted");
    expect(query.text).toContain('object_closure(object_class, object_id)');
    expect(query.text).toContain('installed_extensions(_id, extnamespace)');
    expect(query.text).toContain('pg_depend.refclassid');
    expect(query.text).toContain("where deptype IN ('a', 'e')");
    expect(query.text).toContain('pg_constraint.conrelid = object_closure.object_id');
    expect(query.text).toContain('pg_proc.proallargtypes');
    expect(query.text).toContain('pg_type.typbasetype');
    expect(query.text).toContain('pg_inherits.inhparent');
    expect(query.text).toContain('pg_extension.extnamespace');
    expect(query.text).toContain(
      'pg_extension.oid = any (array(select installed_extensions._id'
    );
    // ACL evaluation walks every grant entry, including roles unrelated to the
    // runtime login. Keep the stock role and membership result sets complete so
    // PgRBACPlugin cannot fail on a retained object's unrelated ACL grantee.
    expect(query.text).toContain('from pg_catalog.pg_roles\n  ),');
    expect(query.text).toContain('where roleid in (select roles._id from roles)');
    expect(query.text).not.toContain('pg_roles.rolname = current_user');
    expect(query.text).not.toContain('and member in (select roles._id from roles)');
    expect(query.text).toMatch(/from pg_catalog\.pg_language\s+where true/);
    expect(query.text).toMatch(/from pg_catalog\.pg_am\s+where true/);
    expect(query.text).not.toContain('namespace_closure');
    expect(query.text).not.toContain('pg_inherits.inhparent = object_closure.object_id');
    expect(query.text).toContain(
      "or pg_type.typnamespace = 'pg_catalog'::regnamespace"
    );
  });

  it('can retain only catalog types reached by the dependency closure', () => {
    const query = makeScopedQueryWithCatalogTypes(['tenant_a'], {
      catalogTypes: 'dependency-closure',
      capabilityExtensions: ['pg_trgm', 'vector', 'pg_trgm']
    });

    expect(query.values).toEqual([['tenant_a'], ['pg_trgm', 'vector']]);
    expect(query.text).not.toContain('pg_trgm');
    expect(query.text).not.toContain('vector');
    expect(query.text).toContain(
      'pg_extension.extname in (\n      select capability_extension_names.extension_name'
    );
    expect(query.text).toContain(
      "pg_type.oid = any (array(select object_id from object_closure where object_class = 'pg_catalog.pg_type'::regclass))"
    );
    expect(query.text).not.toContain(
      "or pg_type.typnamespace = 'pg_catalog'::regnamespace"
    );
    expect(query.text).toContain(
      'retained_index_support_objects(object_class, object_id)'
    );
    expect(query.text).toContain('retained_index_metadata.indclass::oid[]');
    expect(query.text).toContain("'pg_catalog.pg_opclass'::regclass::oid");
    expect(query.text).toContain("'pg_catalog.pg_opfamily'::regclass::oid");
    expect(query.text).toContain("'pg_catalog.pg_operator'::regclass::oid");
    expect(query.text).toContain('pg_catalog.pg_amop');
    expect(query.text).toContain('pg_catalog.pg_amproc');
    expect(query.text).toContain('retained_index_metadata.indcollation::oid[]');
  });

  it('rejects empty and system-schema scopes', () => {
    expect(() => makeSchemaScopedIntrospectionQuery([])).toThrow(
      'requires at least one schema'
    );
    expect(() => makeSchemaScopedIntrospectionQuery(['pg_catalog'])).toThrow(
      'cannot expose system schema'
    );
    expect(() => makeSchemaScopedIntrospectionQuery(['information_schema'])).toThrow(
      'cannot expose system schema'
    );
    expect(() => makeScopedQueryWithCatalogTypes(['tenant_a'], {
      catalogTypes: 'unknown'
    } as never)).toThrow('Unsupported schema-scoped catalog type policy');
    expect(() => makeScopedQueryWithCatalogTypes(['tenant_a'], {
      catalogType: 'dependency-closure'
    } as never)).toThrow('Unsupported schema-scoped introspection option');
    expect(() => makeScopedQueryWithCatalogTypes(['tenant_a'], {
      capabilityExtensions: [' pg_trgm']
    })).toThrow('must contain exact non-empty extension names');
  });
});
