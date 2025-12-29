process.env.LOG_SCOPE = 'pgsql-test';

import { getConnEnvOptions } from '@pgpmjs/env';
import { getPgEnvOptions } from 'pg-env';
import { Client } from 'pg';

import { getConnections } from '../src/connect';

jest.setTimeout(30000);

const getRootConfig = () => {
  const conn = getConnEnvOptions();
  return getPgEnvOptions({ database: conn.rootDb });
};

const dbExists = async (dbName: string): Promise<boolean> => {
  const client = new Client(getRootConfig());
  await client.connect();
  try {
    const res = await client.query(
      'select 1 from pg_database where datname = $1',
      [dbName]
    );
    return res.rowCount > 0;
  } finally {
    await client.end();
  }
};

describe('teardown', () => {
  it('drops the test database on teardown', async () => {
    const { db, teardown } = await getConnections({}, []);
    const dbName = db.config.database;

    expect(await dbExists(dbName)).toBe(true);

    await teardown();

    const existsAfter = await dbExists(dbName);
    expect(existsAfter).toBe(false);
  });

  it('drops the database even with an external client connected', async () => {
    const { db, teardown } = await getConnections({}, []);
    const dbName = db.config.database;

    const extraClient = new Client({ ...db.config });
    extraClient.on('error', () => {});
    await extraClient.connect();
    await extraClient.query('select 1');

    expect(await dbExists(dbName)).toBe(true);

    await teardown();

    const existsAfter = await dbExists(dbName);
    expect(existsAfter).toBe(false);

    await extraClient.end().catch(() => {});
  });
});
