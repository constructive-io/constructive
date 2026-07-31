import { loadModule } from 'plpgsql-parser';

import { restructureChanges } from '../src/granularity-driver';

beforeAll(async () => {
  await loadModule();
});

const ATOMIC_CHANGES = [
  {
    name: 'schemas/app',
    dependencies: [],
    deploy: 'CREATE SCHEMA app;'
  },
  {
    name: 'schemas/app/tables/users',
    dependencies: ['schemas/app'],
    deploy: [
      'CREATE TABLE app.users ();',
      'ALTER TABLE app.users ADD COLUMN id uuid;',
      'ALTER TABLE app.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);'
    ].join('\n')
  },
  {
    name: 'schemas/app/tables/orders',
    dependencies: ['schemas/app'],
    deploy: [
      'CREATE TABLE app.orders ();',
      'ALTER TABLE app.orders ADD COLUMN id uuid;',
      'ALTER TABLE app.orders ADD COLUMN user_id uuid;'
    ].join('\n')
  },
  {
    name: 'schemas/app/tables/orders_fk',
    dependencies: ['schemas/app/tables/orders', 'schemas/app/tables/users'],
    deploy: 'ALTER TABLE app.orders ADD CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES app.users (id);'
  }
];

describe('restructureChanges', () => {
  it('consolidates a module into fully-baked per-object changes', () => {
    const result = restructureChanges(ATOMIC_CHANGES, { granularity: 'consolidated' });
    expect(result.warnings).toEqual([]);

    const names = result.changes.map(c => c.name);
    expect(names).toEqual([
      'schemas/app',
      'schemas/app/tables/users',
      'schemas/app/tables/orders'
    ]);

    const users = result.changes.find(c => c.name === 'schemas/app/tables/users')!;
    expect(users.deploy).not.toContain('ALTER TABLE');
    expect(users.deploy).toContain('PRIMARY KEY');
    expect(users.dependencies).toContain('schemas/app');

    const orders = result.changes.find(c => c.name === 'schemas/app/tables/orders')!;
    expect(orders.deploy).toContain('FOREIGN KEY');
    expect(orders.dependencies).toContain('schemas/app/tables/users');
  });

  it('object granularity keeps cross-table FKs as separate statements', () => {
    const result = restructureChanges(ATOMIC_CHANGES, { granularity: 'object' });
    const all = result.changes.map(c => c.deploy).join('\n');
    expect(all).toContain('ALTER TABLE');
    expect(all).toContain('FOREIGN KEY');
    // Columns still folded into the creates.
    const users = result.changes.find(c => c.name === 'schemas/app/tables/users')!;
    expect(users.deploy).toContain('id uuid');
  });

  it('atomize explodes consolidated changes back to per-statement shape', () => {
    const consolidated = restructureChanges(ATOMIC_CHANGES, { granularity: 'consolidated' });
    const atomic = restructureChanges(consolidated.changes, { granularity: 'atomic' });
    const users = atomic.changes.find(c => c.name === 'schemas/app/tables/users')!;
    expect(users.deploy).toContain('ADD COLUMN');
    expect(users.deploy.match(/ALTER TABLE/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it('supports custom change naming', () => {
    const result = restructureChanges(ATOMIC_CHANGES, {
      granularity: 'consolidated',
      changeName: f => `obj/${f.creates[0]?.name ?? 'misc'}`
    });
    expect(result.changes.map(c => c.name)).toEqual(['obj/app', 'obj/users', 'obj/orders']);
  });
});
