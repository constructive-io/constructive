import { getConnections, PgTestClient } from 'pgsql-test';

import { introspectObjectAcls, type ObjectAclSnapshot } from '../src/pg/objects';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  // Sequences and foreign tables are `relkind` 'S' and 'f': neither is read by
  // the table snapshot, and both carry ACLs.
  await pg.any(`
    CREATE SCHEMA fx_objacl;
    CREATE ROLE fx_obj_anon;

    CREATE SEQUENCE fx_objacl.free_standing;
    GRANT USAGE, SELECT ON SEQUENCE fx_objacl.free_standing TO fx_obj_anon;

    CREATE TABLE fx_objacl.orders (id serial PRIMARY KEY, total numeric);
    GRANT USAGE ON SEQUENCE fx_objacl.orders_id_seq TO fx_obj_anon;

    CREATE SEQUENCE fx_objacl.ungranted;

    CREATE EXTENSION IF NOT EXISTS postgres_fdw;
    CREATE SERVER fx_obj_srv FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (host 'localhost', dbname 'postgres');
    CREATE FOREIGN TABLE fx_objacl.remote (id int)
      SERVER fx_obj_srv OPTIONS (schema_name 'public', table_name 'nothing');
    GRANT SELECT ON fx_objacl.remote TO fx_obj_anon;
  `);
});

afterAll(async () => {
  await pg.any(`
    DROP SCHEMA fx_objacl CASCADE;
    DROP SERVER fx_obj_srv CASCADE;
    DROP ROLE fx_obj_anon;
  `);
  await teardown();
});

const find = (objects: ObjectAclSnapshot[], name: string) =>
  objects.find((o) => o.name === name);

const granted = (o: ObjectAclSnapshot | undefined) =>
  (o?.grants ?? []).filter((g) => g.role === 'fx_obj_anon').map((g) => g.privilege).sort();

describe('introspectObjectAcls', () => {
  it('reads sequences and foreign tables, and nothing else', async () => {
    const objects = await introspectObjectAcls(pg.client, { schemas: ['fx_objacl'] });
    expect(objects.map((o) => `${o.kind}:${o.name}`).sort()).toEqual([
      'foreign table:remote',
      'sequence:free_standing',
      'sequence:orders_id_seq',
      'sequence:ungranted'
    ]);
  });

  it('reports sequence privileges the way the ACL stores them', async () => {
    const objects = await introspectObjectAcls(pg.client, { schemas: ['fx_objacl'] });
    expect(granted(find(objects, 'free_standing'))).toEqual(['SELECT', 'USAGE']);
    expect(granted(find(objects, 'ungranted'))).toEqual([]);
  });

  it('links a serial sequence to the column it feeds, and leaves a free-standing one unlinked', async () => {
    const objects = await introspectObjectAcls(pg.client, { schemas: ['fx_objacl'] });
    // The difference between a load-bearing USAGE grant and a gratuitous one.
    expect(find(objects, 'orders_id_seq')?.ownedBy).toBe('fx_objacl.orders.id');
    expect(find(objects, 'free_standing')?.ownedBy).toBeUndefined();
  });

  it('names the server behind a foreign table', async () => {
    const objects = await introspectObjectAcls(pg.client, { schemas: ['fx_objacl'] });
    const remote = find(objects, 'remote');
    expect(remote?.server).toBe('fx_obj_srv');
    expect(granted(remote)).toEqual(['SELECT']);
  });

  it('cannot be handed RLS by Postgres at all, which is why L17 exists', async () => {
    await expect(
      pg.any('ALTER FOREIGN TABLE fx_objacl.remote ENABLE ROW LEVEL SECURITY')
    ).rejects.toThrow(/not supported for foreign tables/);
  });
});
