import { Pool } from 'pg';

import {
  prepareFixture,
  validateFixtureSchema,
  validateFixtureTableCount,
} from '../src/fixture';

jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

type MockClient = {
  query: jest.Mock;
  release: jest.Mock;
};

type MockPool = {
  connect: jest.Mock;
  end: jest.Mock;
};

const fixtureOptions = {
  databaseUrl: 'postgres://fixture-test',
  schema: 'cperf_fixture_test',
  tables: 1,
};

const queryResult = (text: string) => {
  if (text.includes('pg_namespace')) {
    return { rows: [{ exists: false }] };
  }
  if (text.includes('current_database')) {
    return { rows: [{ database: 'fixture_db', server_version: '16' }] };
  }
  return { rows: [] };
};

const createMocks = (): { client: MockClient; pool: MockPool } => {
  const client: MockClient = {
    query: jest.fn(async (text: string) => queryResult(text)),
    release: jest.fn(),
  };
  const pool: MockPool = {
    connect: jest.fn().mockResolvedValue(client),
    end: jest.fn().mockResolvedValue(undefined),
  };
  (Pool as unknown as jest.Mock).mockImplementation(() => pool);
  return { client, pool };
};

const rejected = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected prepareFixture to reject');
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fixture safety', () => {
  test('only accepts narrowly scoped benchmark schema names', () => {
    expect(validateFixtureSchema('cperf_example_1')).toBe('cperf_example_1');
    expect(() => validateFixtureSchema('public')).toThrow(
      'must start with cperf_'
    );
    expect(() =>
      validateFixtureSchema('cperf_example; drop schema public')
    ).toThrow('must start with cperf_');
  });

  test('bounds generated fixture size', () => {
    expect(validateFixtureTableCount(64)).toBe(64);
    expect(() => validateFixtureTableCount(0)).toThrow('between 1 and 500');
    expect(() => validateFixtureTableCount(501)).toThrow('between 1 and 500');
  });
});

describe('fixture resource lifecycle', () => {
  test('ends the pool when connecting fails without releasing a client', async () => {
    const { client, pool } = createMocks();
    const connectError = new Error('connect failed');
    pool.connect.mockRejectedValue(connectError);

    await expect(prepareFixture(fixtureOptions)).rejects.toBe(connectError);

    expect(client.release).not.toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  test('retains a falsy connection failure when ending the pool also fails', async () => {
    const { client, pool } = createMocks();
    const endError = new Error('end failed');
    pool.connect.mockRejectedValue(undefined);
    pool.end.mockRejectedValue(endError);

    const error = await rejected(prepareFixture(fixtureOptions));

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([undefined, endError]);
    expect(
      (error as AggregateError & { cause: unknown }).cause
    ).toBeUndefined();
    expect(client.release).not.toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  test('commits and releases the client before ending the pool on success', async () => {
    const { client, pool } = createMocks();

    await expect(prepareFixture(fixtureOptions)).resolves.toEqual(
      expect.objectContaining({
        database: 'fixture_db',
        tableCount: 2,
        functionCount: 1,
      })
    );

    expect(client.query).toHaveBeenCalledWith('commit');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(client.release.mock.invocationCallOrder[0]).toBeLessThan(
      pool.end.mock.invocationCallOrder[0]
    );
  });

  test('rolls back, releases, and ends resources after a SQL failure', async () => {
    const { client, pool } = createMocks();
    const queryError = new Error('create schema failed');
    client.query.mockImplementation(async (text: string) => {
      if (text.includes('create schema')) {
        throw queryError;
      }
      return queryResult(text);
    });

    await expect(prepareFixture(fixtureOptions)).rejects.toBe(queryError);

    expect(client.query).toHaveBeenCalledWith('rollback');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  test('retains a rollback failure with the original SQL failure', async () => {
    const { client, pool } = createMocks();
    const queryError = new Error('create schema failed');
    const rollbackError = new Error('rollback failed');
    client.query.mockImplementation(async (text: string) => {
      if (text.includes('create schema')) {
        throw queryError;
      }
      if (text === 'rollback') {
        throw rollbackError;
      }
      return queryResult(text);
    });

    const error = await rejected(prepareFixture(fixtureOptions));

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([
      queryError,
      rollbackError,
    ]);
    expect((error as AggregateError & { cause: unknown }).cause).toBe(
      queryError
    );
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  test('still ends the pool when releasing the client fails', async () => {
    const { client, pool } = createMocks();
    const releaseError = new Error('release failed');
    client.release.mockImplementation(() => {
      throw releaseError;
    });

    await expect(prepareFixture(fixtureOptions)).rejects.toBe(releaseError);

    expect(client.release).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  test('surfaces a pool end failure after releasing the client', async () => {
    const { client, pool } = createMocks();
    const endError = new Error('end failed');
    pool.end.mockRejectedValue(endError);

    await expect(prepareFixture(fixtureOptions)).rejects.toBe(endError);

    expect(client.release).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  test('orders the primary and cleanup failures and preserves the primary cause', async () => {
    const { client, pool } = createMocks();
    const queryError = new Error('create schema failed');
    const rollbackError = new Error('rollback failed');
    const releaseError = new Error('release failed');
    const endError = new Error('end failed');
    client.query.mockImplementation(async (text: string) => {
      if (text.includes('create schema')) {
        throw queryError;
      }
      if (text === 'rollback') {
        throw rollbackError;
      }
      return queryResult(text);
    });
    client.release.mockImplementation(() => {
      throw releaseError;
    });
    pool.end.mockRejectedValue(endError);

    const error = await rejected(prepareFixture(fixtureOptions));

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([
      queryError,
      rollbackError,
      releaseError,
      endError,
    ]);
    expect((error as AggregateError & { cause: unknown }).cause).toBe(
      queryError
    );
  });
});
