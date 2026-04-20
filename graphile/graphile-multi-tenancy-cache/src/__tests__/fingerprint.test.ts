import { getSchemaFingerprint, type MinimalIntrospection } from '../utils/fingerprint';

/**
 * Helper: build a minimal introspection fixture for two tenants
 * with identical structure but different schema names.
 */
function makeIntrospection(schemaName: string, schemaOid: string): MinimalIntrospection {
  return {
    namespaces: [
      { nspname: schemaName, oid: schemaOid },
      { nspname: 'pg_catalog', oid: '11' },
    ],
    classes: [
      { relname: 'users', relnamespace: schemaOid, relkind: 'r' },
      { relname: 'posts', relnamespace: schemaOid, relkind: 'r' },
    ],
    attributes: [
      { attrelid: 'users', attname: 'id', atttypid: '23', attnum: 1, attnotnull: true },
      { attrelid: 'users', attname: 'name', atttypid: '25', attnum: 2, attnotnull: false },
      { attrelid: 'posts', attname: 'id', atttypid: '23', attnum: 1, attnotnull: true },
      { attrelid: 'posts', attname: 'title', atttypid: '25', attnum: 2, attnotnull: false },
      { attrelid: 'posts', attname: 'user_id', atttypid: '23', attnum: 3, attnotnull: true },
    ],
    constraints: [
      { conname: 'users_pkey', conrelid: 'users', contype: 'p', conkey: [1], confrelid: null, confkey: null },
      { conname: 'posts_pkey', conrelid: 'posts', contype: 'p', conkey: [1], confrelid: null, confkey: null },
      { conname: 'posts_user_id_fkey', conrelid: 'posts', contype: 'f', conkey: [3], confrelid: 'users', confkey: [1] },
    ],
    types: [
      { typname: 'int4', typnamespace: schemaOid, typtype: 'b' },
    ],
    procs: [
      { proname: 'get_user', pronamespace: schemaOid, proargtypes: '23', prorettype: '2249', provolatile: 's' },
    ],
  };
}

describe('getSchemaFingerprint', () => {
  it('produces the same fingerprint for identical structures with different schema names', () => {
    const tenant1 = makeIntrospection('t_1_services_public', '100');
    const tenant2 = makeIntrospection('t_2_services_public', '200');

    const fp1 = getSchemaFingerprint(tenant1, ['t_1_services_public']);
    const fp2 = getSchemaFingerprint(tenant2, ['t_2_services_public']);

    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints when table structure differs', () => {
    const tenant1 = makeIntrospection('t_1_services_public', '100');
    const tenant2 = makeIntrospection('t_2_services_public', '200');

    // Add an extra column to tenant2
    tenant2.attributes.push({
      attrelid: 'posts',
      attname: 'body',
      atttypid: '25',
      attnum: 4,
      attnotnull: false,
    });

    const fp1 = getSchemaFingerprint(tenant1, ['t_1_services_public']);
    const fp2 = getSchemaFingerprint(tenant2, ['t_2_services_public']);

    expect(fp1).not.toBe(fp2);
  });

  it('produces different fingerprints when constraint structure differs', () => {
    const tenant1 = makeIntrospection('t_1_services_public', '100');
    const tenant2 = makeIntrospection('t_2_services_public', '200');

    // Add a unique constraint to tenant2
    tenant2.constraints.push({
      conname: 'users_name_unique',
      conrelid: 'users',
      contype: 'u',
      conkey: [2],
      confrelid: null,
      confkey: null,
    });

    const fp1 = getSchemaFingerprint(tenant1, ['t_1_services_public']);
    const fp2 = getSchemaFingerprint(tenant2, ['t_2_services_public']);

    expect(fp1).not.toBe(fp2);
  });

  it('returns a valid SHA-256 hex string', () => {
    const introspection = makeIntrospection('public', '100');
    const fp = getSchemaFingerprint(introspection);

    expect(fp).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const introspection = makeIntrospection('public', '100');

    const fp1 = getSchemaFingerprint(introspection);
    const fp2 = getSchemaFingerprint(introspection);

    expect(fp1).toBe(fp2);
  });

  it('filters by schemaNames when provided', () => {
    const introspection: MinimalIntrospection = {
      namespaces: [
        { nspname: 'schema_a', oid: '100' },
        { nspname: 'schema_b', oid: '200' },
      ],
      classes: [
        { relname: 'users', relnamespace: '100', relkind: 'r' },
        { relname: 'orders', relnamespace: '200', relkind: 'r' },
      ],
      attributes: [],
      constraints: [],
      types: [],
      procs: [],
    };

    const fpA = getSchemaFingerprint(introspection, ['schema_a']);
    const fpBoth = getSchemaFingerprint(introspection, ['schema_a', 'schema_b']);

    expect(fpA).not.toBe(fpBoth);
  });
});
