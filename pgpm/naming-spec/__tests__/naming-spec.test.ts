import { alterationPathFor, ObjectIdentity, pathFor, PGPM_NAMING_SPEC_VERSION } from '../src';

const id = (partial: Partial<ObjectIdentity> & Pick<ObjectIdentity, 'kind' | 'name'>): ObjectIdentity => ({
  schema: 'app',
  ...partial
});

describe('PGPM naming spec v1', () => {
  it('declares its spec version', () => {
    expect(PGPM_NAMING_SPEC_VERSION).toBe(1);
  });

  it('renders canonical directory-style paths per object kind (db_deps parity)', () => {
    expect(pathFor(id({ kind: 'schema', schema: null, name: 'app' }))).toBe('schemas/app/schema');
    expect(pathFor(id({ kind: 'table', name: 'users' }))).toBe('schemas/app/tables/users/table');
    expect(pathFor(id({ kind: 'view', name: 'v_users' }))).toBe('schemas/app/views/v_users/view');
    expect(pathFor(id({ kind: 'function', name: 'fn' }))).toBe('schemas/app/procedures/fn/procedure');
    expect(pathFor(id({ kind: 'type', name: 'status' }))).toBe('schemas/app/types/status');
    expect(pathFor(id({ kind: 'sequence', name: 'seq' }))).toBe('schemas/app/sequences/seq');
    expect(pathFor(id({ kind: 'extension', schema: null, name: 'pgcrypto' }))).toBe('extensions/pgcrypto');
    expect(pathFor(id({ kind: 'role', schema: null, name: 'admin' }))).toBe('roles/admin');
  });

  it('renders flat-style paths for hand-authored layouts', () => {
    const flat = { style: 'flat' as const };
    expect(pathFor(id({ kind: 'function', name: 'fn' }), flat)).toBe('schemas/app/procedures/fn');
    expect(pathFor(id({ kind: 'view', name: 'v_users' }), flat)).toBe('schemas/app/views/v_users');
    expect(pathFor(id({ kind: 'policy', name: 'p', table: 'users' }), flat))
      .toBe('schemas/app/tables/users/policies/p');
  });

  it('scopes table-owned objects under the table', () => {
    expect(pathFor(id({ kind: 'trigger', name: 'trg', table: 'users' })))
      .toBe('schemas/app/tables/users/triggers/trg');
    expect(pathFor(id({ kind: 'policy', name: 'p', table: 'users' })))
      .toBe('schemas/app/tables/users/policies/p/policy');
    expect(pathFor(id({ kind: 'index', name: 'users_email_idx', table: 'users' })))
      .toBe('schemas/app/tables/users/indexes/users_email_idx');
    expect(pathFor(id({ kind: 'constraint', name: 'users_pkey', table: 'users' })))
      .toBe('schemas/app/tables/users/constraints/users_pkey/constraint');
    expect(pathFor(id({ kind: 'column', name: 'email', table: 'users' })))
      .toBe('schemas/app/tables/users/columns/email/column');
    expect(pathFor(id({ kind: 'column', name: 'email', table: 'users' }), { style: 'flat' }))
      .toBe('schemas/app/tables/users/columns/email');
    expect(pathFor(id({ kind: 'seed_dml', name: 'users', table: 'users' })))
      .toBe('schemas/app/tables/users/fixtures/users');
  });

  it('numbers re-alterations like db_deps.next_alteration', () => {
    const parent = 'schemas/app/tables/users/table';
    expect(alterationPathFor(parent, 1)).toBe('schemas/app/tables/users/table/alterations/alt0000000001');
    expect(alterationPathFor(alterationPathFor(parent, 1), 2))
      .toBe('schemas/app/tables/users/table/alterations/alt0000000002');
  });

  it('defaults missing schema to public and unknown kinds to objects/', () => {
    expect(pathFor(id({ kind: 'table', schema: null, name: 'users' })))
      .toBe('schemas/public/tables/users/table');
    expect(pathFor(id({ kind: 'other', name: 'thing' }))).toBe('schemas/app/objects/thing');
  });

  it('is a pure projection: same identity, same path, no state', () => {
    const identity = id({ kind: 'table', name: 'users' });
    expect(pathFor(identity)).toBe(pathFor({ ...identity }));
  });
});
