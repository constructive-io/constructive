import type { Pool } from 'pg';

import { createDefaultRegistry } from '../../src/loaders';
import { createLoaderRegistry } from '../../src/loaders/registry';
import { ssoSurfaceLoader } from '../../src/loaders/sso-surface';
import type { LoaderContext } from '../../src/loaders/types';
import type { SsoSurface } from '../../src/types';

interface Call {
  text: string;
  values?: unknown[];
}

const fakePool = (rows: unknown[]) => {
  const calls: Call[] = [];
  const pool = {
    query: jest.fn(async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      return { rows };
    })
  } as unknown as Pool;
  return { calls, pool };
};

const ctx = (tenantPool: Pool, databaseId = 'db-1'): LoaderContext => ({
  routingPool: {} as Pool,
  tenantPool,
  databaseId,
  dbname: 'tenant'
});

beforeEach(() => ssoSurfaceLoader.invalidate());

describe('ssoSurfaceLoader', () => {
  it('resolves the database-scoped private schema from authoritative metadata', async () => {
    const { calls, pool } = fakePool([
      { private_schema: 'tenant_a_sso_private' }
    ]);

    const surface: SsoSurface | undefined = await ssoSurfaceLoader.resolve(
      ctx(pool, 'db-a')
    );

    expect(surface).toEqual({ privateSchema: 'tenant_a_sso_private' });
    expect(calls).toHaveLength(1);
    expect(calls[0].values).toEqual(['db-a']);
    expect(calls[0].text).toMatch(/unified_auth\.database_id = \$1/);
    expect(calls[0].text).toMatch(/unified_auth\.scope = 'database'/);
    expect(calls[0].text).toMatch(
      /private_schema\.id = unified_auth\.private_schema_id/
    );
    expect(calls[0].text).toMatch(
      /private_schema\.schema_name AS private_schema/
    );
  });

  it('returns undefined when this Tenant has no provisioned module', async () => {
    const { pool } = fakePool([]);
    await expect(ssoSurfaceLoader.resolve(ctx(pool))).resolves.toBeUndefined();
  });

  it('does not run an unkeyed lookup without a database ID', async () => {
    const { calls, pool } = fakePool([]);
    await expect(ssoSurfaceLoader.resolve(ctx(pool, ''))).rejects.toThrow(
      /no databaseId/
    );
    expect(calls).toHaveLength(0);
  });

  it('is typed but remains explicitly opt-in', async () => {
    expect(createDefaultRegistry().has('ssoSurface')).toBe(false);

    const registry = createLoaderRegistry();
    registry.register(ssoSurfaceLoader);
    expect(registry.has('ssoSurface')).toBe(true);
  });
});
