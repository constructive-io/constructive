import { loadModule } from 'plpgsql-parser';

import { restructureChanges } from '../src/granularity-driver';

beforeAll(async () => {
  await loadModule();
});

const ATOMIC_CHANGES = [
  {
    name: 'schemas/app/schema',
    dependencies: [],
    deploy: 'CREATE SCHEMA app;'
  },
  {
    name: 'schemas/app/tables/users/table',
    dependencies: ['schemas/app/schema'],
    deploy: [
      'CREATE TABLE app.users ();',
      'ALTER TABLE app.users ADD COLUMN id uuid;',
      'ALTER TABLE app.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);'
    ].join('\n')
  },
  {
    name: 'schemas/app/tables/orders/table',
    dependencies: ['schemas/app/schema'],
    deploy: [
      'CREATE TABLE app.orders ();',
      'ALTER TABLE app.orders ADD COLUMN id uuid;',
      'ALTER TABLE app.orders ADD COLUMN user_id uuid;'
    ].join('\n')
  },
  {
    name: 'schemas/app/tables/orders_fk',
    dependencies: ['schemas/app/tables/orders/table', 'schemas/app/tables/users/table'],
    deploy: 'ALTER TABLE app.orders ADD CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES app.users (id);'
  }
];

describe('restructureChanges', () => {
  it('consolidates a module into fully-baked per-object changes', () => {
    const result = restructureChanges(ATOMIC_CHANGES, { granularity: 'consolidated' });
    expect(result.warnings).toEqual([]);

    const names = result.changes.map(c => c.name);
    expect(names).toEqual([
      'schemas/app/schema',
      'schemas/app/tables/users/table',
      'schemas/app/tables/orders/table'
    ]);

    const users = result.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(users.deploy).not.toContain('ALTER TABLE');
    expect(users.deploy).toContain('PRIMARY KEY');
    expect(users.dependencies).toContain('schemas/app/schema');

    const orders = result.changes.find(c => c.name === 'schemas/app/tables/orders/table')!;
    expect(orders.deploy).toContain('FOREIGN KEY');
    expect(orders.dependencies).toContain('schemas/app/tables/users/table');
  });

  it('object granularity keeps cross-table FKs as separate statements', () => {
    const result = restructureChanges(ATOMIC_CHANGES, { granularity: 'object' });
    const all = result.changes.map(c => c.deploy).join('\n');
    expect(all).toContain('ALTER TABLE');
    expect(all).toContain('FOREIGN KEY');
    // Columns still folded into the creates.
    const users = result.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(users.deploy).toContain('id uuid');
  });

  it('atomize explodes consolidated changes back to per-statement shape', () => {
    const consolidated = restructureChanges(ATOMIC_CHANGES, { granularity: 'consolidated' });
    const atomic = restructureChanges(consolidated.changes, { granularity: 'atomic' });
    const users = atomic.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(users.deploy).toContain('ADD COLUMN');
    expect(users.deploy.match(/ALTER TABLE/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it('generates per-change revert scripts (drops in reverse topo order)', () => {
    const result = restructureChanges(ATOMIC_CHANGES, { granularity: 'consolidated' });

    const schema = result.changes.find(c => c.name === 'schemas/app/schema')!;
    expect(schema.revert).toEqual('DROP SCHEMA app;');

    const users = result.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(users.revert).toEqual('DROP TABLE app.users;');
    expect(users.revert).not.toContain('CASCADE');
  });

  it('generates per-change verify scripts (raise-on-failure existence checks)', () => {
    const result = restructureChanges(ATOMIC_CHANGES, { granularity: 'consolidated' });

    const schema = result.changes.find(c => c.name === 'schemas/app/schema')!;
    expect(schema.verify).toEqual(
      "SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'app') THEN 1 ELSE 0 END);"
    );

    const users = result.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(users.verify).toEqual(
      "SELECT 1/(CASE WHEN to_regclass('app.users') IS NOT NULL THEN 1 ELSE 0 END);"
    );
  });

  it('reverts the atomic shape per command, dependents first', () => {
    const result = restructureChanges(ATOMIC_CHANGES, { granularity: 'atomic' });
    const users = result.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    // Constraint dropped before its column, column before the table.
    const drops = users.revert.split('\n\n');
    expect(drops[0]).toContain('DROP CONSTRAINT users_pkey');
    expect(drops[drops.length - 1]).toEqual('DROP TABLE app.users;');
  });

  it('prefixes revert/verify warnings with the owning change name', () => {
    const result = restructureChanges([
      {
        name: 'schemas/app/tables/users/table',
        dependencies: [],
        deploy: 'CREATE TABLE app.users (id int);\nALTER TABLE app.users ADD CHECK (id > 0);'
      }
    ], { granularity: 'atomic' });
    expect(result.warnings.some(w =>
      w.startsWith('schemas/app/tables/users/table: revert not derivable:')
    )).toBe(true);
  });

  describe('changeGranularity: alteration', () => {
    const opts = { granularity: 'atomic' as const, changeGranularity: 'alteration' as const };

    it('splits each ADD COLUMN / ADD CONSTRAINT into its own change', () => {
      const result = restructureChanges(ATOMIC_CHANGES, opts);
      const names = result.changes.map(c => c.name);
      expect(names).toEqual([
        'schemas/app/schema',
        'schemas/app/tables/users/table',
        'schemas/app/tables/users/columns/id/column',
        'schemas/app/tables/users/constraints/users_pkey/constraint',
        'schemas/app/tables/orders/table',
        'schemas/app/tables/orders/columns/id/column',
        'schemas/app/tables/orders/columns/user_id/column',
        'schemas/app/tables/orders/constraints/orders_user_fk/constraint'
      ]);
    });

    it('gives each alteration its own deploy/revert/verify', () => {
      const result = restructureChanges(ATOMIC_CHANGES, opts);

      const column = result.changes.find(c => c.name === 'schemas/app/tables/users/columns/id/column')!;
      expect(column.deploy).toContain('ADD COLUMN id');
      expect(column.revert).toContain('DROP COLUMN id');
      expect(column.verify).toContain('information_schema.columns');

      const pkey = result.changes.find(c => c.name === 'schemas/app/tables/users/constraints/users_pkey/constraint')!;
      expect(pkey.deploy).toContain('ADD CONSTRAINT users_pkey');
      expect(pkey.revert).toContain('DROP CONSTRAINT users_pkey');
      expect(pkey.verify).toContain('information_schema.table_constraints');
    });

    it('derives per-alteration requires: column requires table, constraint requires its columns', () => {
      const result = restructureChanges(ATOMIC_CHANGES, opts);

      const column = result.changes.find(c => c.name === 'schemas/app/tables/users/columns/id/column')!;
      expect(column.dependencies).toContain('schemas/app/tables/users/table');

      const pkey = result.changes.find(c => c.name === 'schemas/app/tables/users/constraints/users_pkey/constraint')!;
      expect(pkey.dependencies).toContain('schemas/app/tables/users/table');
      expect(pkey.dependencies).toContain('schemas/app/tables/users/columns/id/column');

      const fk = result.changes.find(c => c.name === 'schemas/app/tables/orders/constraints/orders_user_fk/constraint')!;
      expect(fk.dependencies).toContain('schemas/app/tables/orders/columns/user_id/column');
    });

    it('names unnamed constraints with their Postgres default so each change is revertible', () => {
      const result = restructureChanges([
        {
          name: 'schemas/app/tables/users/table',
          dependencies: [],
          deploy: [
            'CREATE TABLE app.users ();',
            'ALTER TABLE app.users ADD COLUMN id int;',
            'ALTER TABLE app.users ADD PRIMARY KEY (id);'
          ].join('\n')
        }
      ], opts);
      const pkey = result.changes.find(c => c.name === 'schemas/app/tables/users/constraints/users_pkey/constraint')!;
      expect(pkey.deploy).toContain('ADD CONSTRAINT users_pkey');
      expect(pkey.revert).toContain('DROP CONSTRAINT users_pkey');
      expect(result.warnings.filter(w => w.includes('revert not derivable'))).toEqual([]);
    });

    it('default object mode is unchanged', () => {
      const object = restructureChanges(ATOMIC_CHANGES, { granularity: 'atomic' });
      const explicit = restructureChanges(ATOMIC_CHANGES, { granularity: 'atomic', changeGranularity: 'object' });
      expect(explicit.changes).toEqual(object.changes);
    });
  });

  describe('changeGranularity: single', () => {
    it('collapses the whole module into one change with one deploy/revert/verify', () => {
      const result = restructureChanges(ATOMIC_CHANGES, {
        granularity: 'consolidated',
        changeGranularity: 'single'
      });
      expect(result.changes).toHaveLength(1);
      const [change] = result.changes;
      expect(change.name).toBe('module/init');
      expect(change.deploy).toContain('CREATE SCHEMA app');
      expect(change.deploy).toContain('CREATE TABLE app.users');
      expect(change.deploy).toContain('CREATE TABLE app.orders');
      expect(change.revert).toContain('DROP TABLE');
      expect(change.revert).toContain('DROP SCHEMA app');
      expect(change.verify).toContain('information_schema');
    });

    it('keeps only external requires and honors a custom single change name', () => {
      const withExternal = ATOMIC_CHANGES.map((c, i) =>
        i === 0 ? { ...c, dependencies: ['other-module:schemas/ext/schema'] } : c
      );
      const result = restructureChanges(withExternal, {
        granularity: 'consolidated',
        changeGranularity: 'single',
        singleChangeName: 'migration/v1'
      });
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].name).toBe('migration/v1');
      expect(result.changes[0].dependencies).toEqual(['other-module:schemas/ext/schema']);
    });
  });

  it('supports custom change naming', () => {
    const result = restructureChanges(ATOMIC_CHANGES, {
      granularity: 'consolidated',
      changeName: f => `obj/${f.creates[0]?.name ?? 'misc'}`
    });
    expect(result.changes.map(c => c.name)).toEqual(['obj/app', 'obj/users', 'obj/orders']);
  });
});
