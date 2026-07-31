import { ObjectIdentity, pathFor, PGPM_NAMING_SPEC_VERSION } from '../src';

const id = (partial: Partial<ObjectIdentity> & Pick<ObjectIdentity, 'kind' | 'name'>): ObjectIdentity => ({
  schema: 'app',
  ...partial
});

describe('PGPM naming spec v1', () => {
  it('declares its spec version', () => {
    expect(PGPM_NAMING_SPEC_VERSION).toBe(1);
  });

  it('renders canonical paths per object kind', () => {
    expect(pathFor(id({ kind: 'schema', schema: null, name: 'app' }))).toBe('schemas/app/schema');
    expect(pathFor(id({ kind: 'table', name: 'users' }))).toBe('schemas/app/tables/users/table');
    expect(pathFor(id({ kind: 'view', name: 'v_users' }))).toBe('schemas/app/views/v_users');
    expect(pathFor(id({ kind: 'function', name: 'fn' }))).toBe('schemas/app/procedures/fn');
    expect(pathFor(id({ kind: 'type', name: 'status' }))).toBe('schemas/app/types/status');
    expect(pathFor(id({ kind: 'sequence', name: 'seq' }))).toBe('schemas/app/sequences/seq');
    expect(pathFor(id({ kind: 'extension', schema: null, name: 'pgcrypto' }))).toBe('extensions/pgcrypto');
    expect(pathFor(id({ kind: 'role', schema: null, name: 'admin' }))).toBe('roles/admin');
  });

  it('scopes table-owned objects under the table', () => {
    expect(pathFor(id({ kind: 'trigger', name: 'trg', table: 'users' })))
      .toBe('schemas/app/tables/users/triggers/trg');
    expect(pathFor(id({ kind: 'policy', name: 'p', table: 'users' })))
      .toBe('schemas/app/tables/users/policies/p');
    expect(pathFor(id({ kind: 'index', name: 'users_email_idx', table: 'users' })))
      .toBe('schemas/app/tables/users/indexes/users_email_idx');
    expect(pathFor(id({ kind: 'constraint', name: 'users', table: 'users' })))
      .toBe('schemas/app/tables/users/constraints/users');
    expect(pathFor(id({ kind: 'seed_dml', name: 'users', table: 'users' })))
      .toBe('schemas/app/tables/users/fixtures/users');
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
