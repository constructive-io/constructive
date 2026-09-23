process.env.LOG_SCOPE = 'pgsql-test';

import { DeferredConstraintsMode } from '@pgpmjs/types';

import { getConnections } from '../src/connect';
import { PgTestClient } from '../src/test-client';

const SCHEMA = `
  CREATE TABLE parents (
    id int PRIMARY KEY
  );
  CREATE TABLE children (
    id int PRIMARY KEY,
    parent_id int NOT NULL
      REFERENCES parents(id) DEFERRABLE INITIALLY DEFERRED
  );
  CREATE TABLE slots (
    id int PRIMARY KEY,
    position int NOT NULL,
    CONSTRAINT slots_position_key UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
  );
  INSERT INTO slots (id, position) VALUES (1, 1), (2, 2);
`;

const connect = async (deferredConstraints: DeferredConstraintsMode) => {
  const conn = await getConnections({ db: { deferredConstraints } }, []);
  await conn.pg.query(SCHEMA);
  return conn;
};

const insertDanglingChild = (client: PgTestClient) =>
  client.query(`INSERT INTO children (id, parent_id) VALUES (1, 999)`);

const insertChildThenParent = async (client: PgTestClient) => {
  await client.query(`INSERT INTO children (id, parent_id) VALUES (1, 1)`);
  await client.query(`INSERT INTO parents (id) VALUES (1)`);
};

const swapPositions = async (client: PgTestClient) => {
  await client.query(`UPDATE slots SET position = 2 WHERE id = 1`);
  await client.query(`UPDATE slots SET position = 1 WHERE id = 2`);
};

let teardown: () => Promise<void>;
let checkPg: PgTestClient;
let immediatePg: PgTestClient;
let offPg: PgTestClient;

beforeAll(async () => {
  ({ pg: checkPg } = await connect('check'));
  ({ pg: immediatePg } = await connect('immediate'));
  ({ pg: offPg, teardown } = await connect('off'));
});

afterAll(async () => {
  await teardown();
});

describe("deferredConstraints: 'check'", () => {
  it('keeps deferral inside the test: child-before-parent and unique swap pass', async () => {
    await checkPg.beforeEach();
    await insertChildThenParent(checkPg);
    await swapPositions(checkPg);
    await expect(checkPg.afterEach()).resolves.toBeUndefined();
  });

  it('fails afterEach for a dangling deferred FK, then rolls back so the client is reusable', async () => {
    await checkPg.beforeEach();
    await insertDanglingChild(checkPg);

    await expect(checkPg.afterEach()).rejects.toThrow(
      /\[pgsql-test\] deferred constraint violated at end of test[\s\S]*children_parent_id_fkey/
    );

    const res = await checkPg.query(`SELECT count(*)::int AS n FROM children`);
    expect(res.rows[0].n).toBe(0);
  });

  it('does not mask an error the test body already raised (aborted transaction)', async () => {
    await checkPg.beforeEach();
    await insertDanglingChild(checkPg);
    await expect(checkPg.query(`SELECT 1/0`)).rejects.toThrow(/division by zero/);

    await expect(checkPg.afterEach()).resolves.toBeUndefined();

    const res = await checkPg.query(`SELECT 1 AS ok`);
    expect(res.rows[0].ok).toBe(1);
  });

  it('checkConstraints() lets a test assert enforcement and leaves afterEach clean', async () => {
    await checkPg.beforeEach();
    await insertDanglingChild(checkPg);

    await expect(checkPg.checkConstraints()).rejects.toThrow(/children_parent_id_fkey/);

    await expect(checkPg.afterEach()).resolves.toBeUndefined();
  });

  it('checkConstraints() is a no-op when nothing is pending', async () => {
    await checkPg.beforeEach();
    await insertChildThenParent(checkPg);
    await expect(checkPg.checkConstraints()).resolves.toBeUndefined();
    await expect(checkPg.afterEach()).resolves.toBeUndefined();
  });

  it('survives publish(): violations after a publish are still caught', async () => {
    await checkPg.beforeEach();
    await checkPg.query(`INSERT INTO parents (id) VALUES (42)`);
    await checkPg.publish();
    await insertDanglingChild(checkPg);
    await expect(checkPg.afterEach()).rejects.toThrow(/children_parent_id_fkey/);
    await checkPg.query(`DELETE FROM parents WHERE id = 42`);
  });
});

describe("deferredConstraints: 'immediate'", () => {
  afterEach(async () => {
    await immediatePg.afterEach();
  });

  it('fails on the offending statement', async () => {
    await immediatePg.beforeEach();
    await expect(insertDanglingChild(immediatePg)).rejects.toThrow(/children_parent_id_fkey/);
  });

  it('disables deferral: child-before-parent fails', async () => {
    await immediatePg.beforeEach();
    await expect(insertChildThenParent(immediatePg)).rejects.toThrow(/children_parent_id_fkey/);
  });

  it('disables deferral: unique swap fails', async () => {
    await immediatePg.beforeEach();
    await expect(swapPositions(immediatePg)).rejects.toThrow(/slots_position_key/);
  });

  it('is re-applied after publish()', async () => {
    await immediatePg.beforeEach();
    await immediatePg.publish();
    await expect(insertDanglingChild(immediatePg)).rejects.toThrow(/children_parent_id_fkey/);
  });
});

describe("deferredConstraints: 'off' (default)", () => {
  it('a dangling deferred FK passes silently and is rolled back', async () => {
    await offPg.beforeEach();
    await insertDanglingChild(offPg);
    await expect(offPg.afterEach()).resolves.toBeUndefined();

    const res = await offPg.query(`SELECT count(*)::int AS n FROM children`);
    expect(res.rows[0].n).toBe(0);
  });

  it('is the default when no mode is given', async () => {
    const { pg } = await getConnections({}, []);
    await pg.query(SCHEMA);
    await pg.beforeEach();
    await insertDanglingChild(pg);
    await expect(pg.afterEach()).resolves.toBeUndefined();
  });
});
