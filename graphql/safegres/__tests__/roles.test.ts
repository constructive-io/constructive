import { resolveRoles } from '../src/pg/roles';

describe('resolveRoles', () => {
  const allRoles = [
    { name: 'authenticated', canLogin: true, isSuper: false, isSystem: false },
    { name: 'anonymous', canLogin: true, isSuper: false, isSystem: false },
    { name: 'postgres', canLogin: true, isSuper: true, isSystem: false },
    { name: 'pg_read_all_stats', canLogin: false, isSuper: false, isSystem: true },
    { name: 'pg_monitor', canLogin: false, isSuper: false, isSystem: true }
  ];

  it('defaults exclude system roles', () => {
    const { roles, excluded } = resolveRoles(allRoles, undefined);
    expect(roles).toEqual(['authenticated', 'anonymous', 'postgres']);
    expect(excluded).toEqual(expect.arrayContaining(['pg_read_all_stats', 'pg_monitor']));
  });

  it('honors --roles filter', () => {
    const { roles } = resolveRoles(allRoles, ['authenticated']);
    expect(roles).toEqual(['authenticated']);
  });

  it('applies --exclude-roles on top', () => {
    const { roles } = resolveRoles(allRoles, undefined, ['postgres']);
    expect(roles).toEqual(['authenticated', 'anonymous']);
  });
});
