import { join } from 'path';
import { seed } from 'pgsql-test';

import { getConnections } from '../src/get-connections';

const currentRoleQuery = '{ currentRole: currentSetting(name: "role") }';

describe.each([
  { name: 'root connection default', useRoot: true, authRole: undefined, allowed: true },
  { name: 'explicit anonymous root role', useRoot: true, authRole: 'anonymous', allowed: false },
  { name: 'ordinary anonymous default', useRoot: false, authRole: undefined, allowed: false }
])('$name', ({ useRoot, authRole, allowed }) => {
  let connections: Awaited<ReturnType<typeof getConnections>>;

  beforeAll(async () => {
    connections = await getConnections(
      { schemas: ['app_public'], useRoot, authRole },
      [seed.sqlfile([
        join(__dirname, '../sql/test.sql'),
        join(__dirname, '../sql/grants.sql')
      ])]
    );
  });

  beforeEach(async () => {
    await connections.db.beforeEach();
  });

  afterEach(async () => {
    connections.pg.setContext({ role: null });
    await connections.db.afterEach();
  });

  afterAll(async () => {
    await connections.teardown();
  });

  it('uses the selected execution role for real PostgreSQL access', async () => {
    const result = await connections.query<{ currentRole: string }>(currentRoleQuery);
    if (allowed) {
      expect(result.errors).toBeUndefined();
      expect(result.data?.currentRole).toBe(connections.pg.config.user);
    } else {
      expect(result.errors?.[0]?.message).toMatch(/permission denied/);
    }
  });

  if (allowed) {
    it('honors request role overrides and restores the next root request', async () => {
      const denied = await connections.query(currentRoleQuery, undefined, undefined, {
        pgSettings: { role: 'anonymous' }
      });
      expect(denied.errors?.[0]?.message).toMatch(/permission denied/);

      const restored = await connections.query<{ currentRole: string }>(currentRoleQuery);
      expect(restored.errors).toBeUndefined();
      expect(restored.data?.currentRole).toBe(connections.pg.config.user);
    });

    it('honors roles explicitly set on the root test client', async () => {
      connections.pg.setContext({ role: 'authenticated' });
      const result = await connections.query<{ currentRole: string }>(currentRoleQuery);
      expect(result.errors).toBeUndefined();
      expect(result.data?.currentRole).toBe('authenticated');
    });
  }
});
