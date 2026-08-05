import {
  createGraphileBuildContract,
  type CreateGraphileBuildContractInput,
  hashGraphileBuildContract
} from '../graphile-build-contract';

const makeContract = (overrides: Partial<CreateGraphileBuildContractInput> = {}) =>
  createGraphileBuildContract({
    configurationIdentity: 'graphile-configuration:v1:test',
    poolIdentity: 'pg:v1:abc',
    databaseId: 'database-a',
    databaseName: 'tenant_a',
    apiId: 'api-a',
    schemas: ['tenant_a_public', 'tenant_a_private'],
    authenticatedRole: 'tenant_user',
    anonymousRole: 'tenant_anon',
    graphiql: true,
    graphiqlOnGraphQLGET: false,
    pluginSettings: {
      enableAggregates: false,
      enablePostgis: true,
      enableSearch: true,
      enableDirectUploads: false,
      enablePresignedUploads: true,
      enableManyToMany: true,
      enableConnectionFilter: true,
      enableLtree: true,
      enableLlm: true,
      enableRealtime: false,
      enableBulk: true,
      enableI18n: true
    },
    ...overrides
  });

describe('GraphileBuildContractV1', () => {
  it('is deterministic across object property ordering', () => {
    const first = makeContract();
    const second = { ...makeContract(), roles: { ...makeContract().roles } };
    expect(hashGraphileBuildContract(first)).toBe(hashGraphileBuildContract(second));
  });

  it('isolates every build-affecting tenant boundary', () => {
    const base = makeContract();
    const variants = [
      { ...base, configurationIdentity: 'graphile-configuration:v1:other' },
      { ...base, poolIdentity: 'pg:v1:different' },
      { ...base, databaseId: 'database-b' },
      { ...base, apiId: 'api-b' },
      { ...base, schemas: [...base.schemas].reverse() },
      { ...base, roles: { ...base.roles, anonymous: 'different_anon' } },
      {
        ...base,
        storageModules: [{
          id: 'storage-a',
          bucketsQualifiedName: '"tenant"."buckets"',
          filesQualifiedName: '"tenant"."files"',
          schemaName: 'tenant',
          bucketsTableName: 'buckets',
          filesTableName: 'files',
          scope: 'app',
          entityTableId: null,
          entityQualifiedName: null,
          endpoint: null,
          publicUrlPrefix: null,
          provider: null,
          allowedOrigins: null,
          uploadUrlExpirySeconds: 900,
          downloadUrlExpirySeconds: 3600,
          defaultMaxFileSize: 1024,
          maxFilenameLength: 255,
          cacheTtlSeconds: 300,
          hasPathShares: false,
          maxBulkFiles: 100,
          maxBulkTotalSize: 1024
        }]
      },
      { ...base, introspectionMode: 'scoped-required' as const },
      { ...base, introspectionClientReleaseMode: 'destroy' as const },
      {
        ...base,
        graphileSettings: { releaseBuildStateAfterValidation: true }
      },
      {
        ...base,
        surface: {
          ...base.surface,
          enableRealtime: true,
          realtimeSchema: 'tenant_a_realtime'
        }
      },
      { ...base, surface: { ...base.surface, graphiql: false } },
      { ...base, surface: { ...base.surface, graphiqlOnGraphQLGET: true } }
    ];

    for (const variant of variants) {
      expect(hashGraphileBuildContract(variant)).not.toBe(hashGraphileBuildContract(base));
    }
  });

  it('accepts exact GraphiQL surface flags and preserves legacy defaults', () => {
    const explicit = makeContract({
      graphiql: false,
      graphiqlOnGraphQLGET: true
    });
    expect(explicit.surface.graphiql).toBe(false);
    expect(explicit.surface.graphiqlOnGraphQLGET).toBe(true);

    const legacy = createGraphileBuildContract({
      configurationIdentity: 'graphile-configuration:v1:legacy',
      poolIdentity: 'pg:v1:legacy',
      databaseId: 'database-legacy',
      databaseName: 'tenant_legacy',
      apiId: 'api-legacy',
      schemas: ['tenant_legacy_public'],
      authenticatedRole: 'tenant_user',
      anonymousRole: 'tenant_anon'
    });
    expect(legacy.surface.graphiql).toBe(true);
    expect(legacy.surface.graphiqlOnGraphQLGET).toBe(false);
    expect(legacy.surface.realtimeSchema).toBeNull();
    expect(legacy.introspectionClientReleaseMode).toBe('reuse');
  });

  it('separates same-source plugin closures with different captured values', () => {
    const pluginFactory = (tenantPolicy: string) => () => tenantPolicy;
    const policyA = pluginFactory('policy-a');
    const policyB = pluginFactory('policy-b');

    expect(policyA.toString()).toBe(policyB.toString());
    const first = makeContract({
      graphileSettings: {
        preset: { schema: { policy: policyA } } as any
      }
    });
    const repeated = makeContract({
      graphileSettings: {
        preset: { schema: { policy: policyA } } as any
      }
    });
    const distinctClosure = makeContract({
      graphileSettings: {
        preset: { schema: { policy: policyB } } as any
      }
    });

    expect(hashGraphileBuildContract(first)).toBe(
      hashGraphileBuildContract(repeated)
    );
    expect(hashGraphileBuildContract(first)).not.toBe(
      hashGraphileBuildContract(distinctClosure)
    );
  });

  it('binds ordered caller plugin code and settings but ignores admission policy', () => {
    const firstHook = () => 'first';
    const secondHook = () => 'second';
    const firstPlugin = {
      name: 'FirstCallerPlugin',
      version: '1.0.0',
      schema: { hooks: { build: firstHook } }
    };
    const secondPlugin = {
      name: 'SecondCallerPlugin',
      version: '2.0.0',
      schema: { hooks: { build: secondHook } }
    };
    const first = makeContract({
      graphileSettings: {
        extends: [{ plugins: [firstPlugin, secondPlugin] } as any],
        trustCallerPresetsInProduction: false
      }
    });
    const reordered = makeContract({
      graphileSettings: {
        extends: [{ plugins: [secondPlugin, firstPlugin] } as any],
        trustCallerPresetsInProduction: false
      }
    });
    const admissionOnly = makeContract({
      graphileSettings: {
        extends: [{ plugins: [firstPlugin, secondPlugin] } as any],
        trustCallerPresetsInProduction: true
      }
    });

    expect(hashGraphileBuildContract(first)).not.toBe(
      hashGraphileBuildContract(reordered)
    );
    expect(hashGraphileBuildContract(first)).toBe(
      hashGraphileBuildContract(admissionOnly)
    );
  });

  it('binds the effective realtime cursor schema only when realtime is enabled', () => {
    const compatibilityDefault = makeContract({ enableRealtime: true });
    const explicitDefault = makeContract({
      enableRealtime: true,
      realtimeSchema: 'realtime_public'
    });
    const tenantScoped = makeContract({
      enableRealtime: true,
      realtimeSchema: 'ctf_a_realtime'
    });
    const disabled = makeContract({
      enableRealtime: false,
      realtimeSchema: 'ignored_when_disabled'
    });

    expect(compatibilityDefault.surface.realtimeSchema).toBe('realtime_public');
    expect(hashGraphileBuildContract(compatibilityDefault)).toBe(
      hashGraphileBuildContract(explicitDefault)
    );
    expect(hashGraphileBuildContract(tenantScoped)).not.toBe(
      hashGraphileBuildContract(compatibilityDefault)
    );
    expect(disabled.surface.realtimeSchema).toBeNull();
    expect(disabled.surface.realtimeNotificationMode).toBeNull();
    expect(disabled.surface.realtimeCursorPollIntervalMs).toBeNull();
  });

  it('binds shared transport identity, role TTL, and cursor timings', () => {
    const first = makeContract({
      enableRealtime: true,
      realtimeNotificationMode: 'shared-exact',
      realtimeListenerPoolIdentity: 'pg-notification-broker:v1:first',
      realtimeNotificationRoleRevalidationMs: 60_000,
      realtimeCursorPollIntervalMs: 5_000,
      realtimeCursorHeartbeatIntervalMs: 30_000
    });
    const changedIdentity = makeContract({
      enableRealtime: true,
      realtimeNotificationMode: 'shared-exact',
      realtimeListenerPoolIdentity: 'pg-notification-broker:v1:second',
      realtimeNotificationRoleRevalidationMs: 60_000,
      realtimeCursorPollIntervalMs: 5_000,
      realtimeCursorHeartbeatIntervalMs: 30_000
    });
    const changedPolling = makeContract({
      enableRealtime: true,
      realtimeNotificationMode: 'shared-exact',
      realtimeListenerPoolIdentity: 'pg-notification-broker:v1:first',
      realtimeNotificationRoleRevalidationMs: 60_000,
      realtimeCursorPollIntervalMs: 30_000,
      realtimeCursorHeartbeatIntervalMs: 30_000
    });

    expect(first.surface).toMatchObject({
      realtimeNotificationMode: 'shared-exact',
      realtimeListenerPoolIdentity: 'pg-notification-broker:v1:first',
      realtimeNotificationRoleRevalidationMs: 60_000,
      realtimeCursorPollIntervalMs: 5_000,
      realtimeCursorHeartbeatIntervalMs: 30_000
    });
    expect(hashGraphileBuildContract(first)).not.toBe(
      hashGraphileBuildContract(changedIdentity)
    );
    expect(hashGraphileBuildContract(first)).not.toBe(
      hashGraphileBuildContract(changedPolling)
    );
  });

  it('rejects shared transport without an opaque listener pool identity', () => {
    expect(() => makeContract({
      enableRealtime: true,
      realtimeNotificationMode: 'shared-exact'
    })).toThrow('requires an opaque listener pool identity');
  });

  it('does not split realtime-disabled identities on an irrelevant cursor schema', () => {
    const first = makeContract({
      enableRealtime: false,
      graphileSettings: {
        realtimeSchema: 'tenant_a_realtime',
        realtimeNotificationMode: 'shared-exact',
        realtimeNotificationRoleRevalidationMs: 1,
        realtimeCursorPollIntervalMs: 1,
        realtimeCursorHeartbeatIntervalMs: 1
      }
    });
    const second = makeContract({
      enableRealtime: false,
      graphileSettings: {
        realtimeSchema: 'tenant_b_realtime',
        realtimeNotificationMode: 'dedicated',
        realtimeNotificationRoleRevalidationMs: 120_000,
        realtimeCursorPollIntervalMs: 60_000,
        realtimeCursorHeartbeatIntervalMs: 180_000
      }
    });

    expect(first.graphileSettings).toEqual({});
    expect(second.graphileSettings).toEqual({});
    expect(hashGraphileBuildContract(first)).toBe(hashGraphileBuildContract(second));
  });
});
