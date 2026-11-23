import { getConnections as getPgConnections } from 'pgsql-test';

import { getConnections } from './connect';

jest.mock('pgsql-test', () => ({
  getConnections: jest.fn(),
}));

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, PGHOST: 'localhost', PGDATABASE: 'postgres' };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

it('uses the connection environment without naming the test database', async () => {
  await getConnections();

  const [options] = jest.mocked(getPgConnections).mock.calls[0];
  expect(options?.pg?.host).toBe('localhost');
  expect(options?.pg).not.toHaveProperty('database');
});

it('honors an explicitly supplied test database name', async () => {
  await getConnections({ pg: { database: 'custom_test_db' } });

  const [options] = jest.mocked(getPgConnections).mock.calls[0];
  expect(options?.pg?.database).toBe('custom_test_db');
});
