import type { DatabaseSettings } from '@constructive-io/express-context';
import type { Pool } from 'pg';

import { createGraphileBuildCacheKey } from 'graphile-cache';

import { createGraphileServerBuildSnapshot } from '../graphile-build-snapshot';

const owner = {};
const pool = {} as Pool;
const maskError = (): void => {};

const makeInput = (overrides: Record<string, unknown> = {}) => ({
  ownerIdentity: owner,
  serviceKey: 'api:db-1:main',
  pool,
  databaseName: 'tenant_one',
  databaseId: 'db-1',
  apiId: 'api-1',
  schemas: ['app', 'auth'],
  anonRole: 'app_anon',
  roleName: 'app_user',
  introspectionRole: 'app_reader',
  databaseSettings: { enableSearch: true, enableRealtime: false } as DatabaseSettings,
  compute: {
    modules: [{
      schemaName: 'compute',
      definitionsTableName: 'definitions',
      bindingsTableName: 'bindings',
      invocationsSchemaName: 'private',
      invocationsTableName: 'invocations',
      invocationsEntityField: 'database_id'
    }]
  },
  explain: false,
  maskError,
  ...overrides
});

const key = (input: Record<string, unknown> = makeInput()): string =>
  createGraphileBuildCacheKey('server', createGraphileServerBuildSnapshot(input as any));

describe('server Graphile build snapshot', () => {
  it.each([
    ['service key', { serviceKey: 'api:db-2:main' }],
    ['pool object', { pool: {} as Pool }],
    ['database name', { databaseName: 'tenant_two' }],
    ['database id', { databaseId: 'db-2' }],
    ['API id', { apiId: 'api-2' }],
    ['schema order', { schemas: ['auth', 'app'] }],
    ['anonymous role', { anonRole: 'other_anon' }],
    ['served role', { roleName: 'other_user' }],
    ['introspection role', { introspectionRole: 'other_reader' }],
    ['caller presets', { graphileOptions: { preset: { schema: { defaultBehavior: '-insert' } } } }],
    ['Grafast cache settings', { graphileOptions: { grafastCache: { queryCacheMaxLength: 100 } } }],
    ['plugin flags', { databaseSettings: { enableSearch: false, enableRealtime: false } }],
    ['compute binding config', {
      compute: { modules: [{
        schemaName: 'compute',
        definitionsTableName: 'definitions',
        bindingsTableName: 'other_bindings',
        invocationsSchemaName: 'private',
        invocationsTableName: 'invocations',
        invocationsEntityField: 'database_id'
      }] }
    }],
    ['explain option', { explain: true }],
    ['mask-error closure', { maskError: (): string => 'different closure' }],
    ['configuration owner', { ownerIdentity: {} }]
  ])('includes the actual producer input for %s', (_label, override) => {
    expect(key({ ...makeInput(), ...override })).not.toBe(key());
  });

  it('keeps the snapshot and its fingerprint stable after the source inputs mutate', () => {
    const input = makeInput();
    const snapshot = createGraphileServerBuildSnapshot(input as any);
    const before = createGraphileBuildCacheKey('server', snapshot);

    input.schemas.push('private');
    (input.databaseSettings as DatabaseSettings).enableSearch = false;
    input.compute.modules[0].bindingsTableName = 'changed';

    expect(createGraphileBuildCacheKey('server', snapshot)).toBe(before);
    expect(snapshot.schemas).toEqual(['app', 'auth']);
    expect(snapshot.databaseSettings?.enableSearch).toBe(true);
    expect(snapshot.computeModules[0].bindingsTableName).toBe('bindings');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.schemas)).toBe(true);
    expect(Object.isFrozen(snapshot.computeModules[0])).toBe(true);
  });

  it('uses the same stable owner and physical pool references across snapshots', () => {
    expect(key()).toBe(key());
  });
});
