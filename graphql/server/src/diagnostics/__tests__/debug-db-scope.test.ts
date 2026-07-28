import type { Pool } from 'pg';

import {
  closeDebugDatabasePools,
  createDebugDatabasePoolScope,
} from '../debug-db-snapshot';

const createPool = () =>
  ({ end: jest.fn(async (): Promise<void> => undefined) }) as unknown as Pool;

describe('debug database pool ownership', () => {
  it('closes only pools in the selected diagnostics scope', async () => {
    const first = createDebugDatabasePoolScope();
    const second = createDebugDatabasePoolScope();
    const firstPool = createPool();
    const secondPool = createPool();
    first.set('same-safe-key', firstPool);
    second.set('same-safe-key', secondPool);

    await closeDebugDatabasePools(first);

    expect(firstPool.end).toHaveBeenCalledTimes(1);
    expect(secondPool.end).not.toHaveBeenCalled();
    expect(second.get('same-safe-key')).toBe(secondPool);

    await closeDebugDatabasePools(second);
  });
});
