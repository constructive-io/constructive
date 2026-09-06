import { getGraphQLEnvVars } from '../env';

describe('GraphQL runtime PostgreSQL environment', () => {
  it('maps the dedicated runtime credentials without changing control-plane pg', () => {
    const result = getGraphQLEnvVars({
      GRAPHQL_RUNTIME_PGUSER: 'graphql_runtime',
      GRAPHQL_RUNTIME_PGPASSWORD: 'runtime-secret'
    });

    expect(result.runtimePg).toEqual({
      user: 'graphql_runtime',
      password: 'runtime-secret'
    });
    expect(result.pg).toBeUndefined();
  });

  it('does not create a runtime override when both variables are absent', () => {
    expect(getGraphQLEnvVars({}).runtimePg).toBeUndefined();
  });
});

describe('Graphile introspection environment', () => {
  it.each(['stock', 'scoped-required'] as const)(
    'accepts the explicit %s mode',
    (introspectionMode) => {
      expect(
        getGraphQLEnvVars({ GRAPHILE_INTROSPECTION_MODE: introspectionMode }).graphile
      ).toEqual({ introspectionMode });
    }
  );

  it('rejects unknown modes instead of falling back to stock', () => {
    expect(() =>
      getGraphQLEnvVars({ GRAPHILE_INTROSPECTION_MODE: 'scoped-if-possible' })
    ).toThrow("GRAPHILE_INTROSPECTION_MODE must be 'stock' or 'scoped-required'");
  });

  it.each(['reuse', 'destroy'] as const)(
    'accepts the explicit %s introspection-client release mode',
    (introspectionClientReleaseMode) => {
      expect(getGraphQLEnvVars({
        GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE: introspectionClientReleaseMode
      }).graphile).toEqual({ introspectionClientReleaseMode });
    }
  );

  it('rejects an unknown introspection-client release mode', () => {
    expect(() => getGraphQLEnvVars({
      GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE: 'best-effort'
    })).toThrow(
      "GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE must be 'reuse' or 'destroy'"
    );
  });

  it('parses the ordered dependency-schema allowlist without duplicates', () => {
    expect(getGraphQLEnvVars({
      GRAPHILE_INTROSPECTION_DEPENDENCY_SCHEMAS: 'extensions, shared_api,extensions'
    }).graphile).toEqual({
      introspectionDependencySchemas: ['extensions', 'shared_api']
    });
  });

  it('rejects an empty dependency-schema entry', () => {
    expect(() => getGraphQLEnvVars({
      GRAPHILE_INTROSPECTION_DEPENDENCY_SCHEMAS: 'extensions, ,shared_api'
    })).toThrow('must be a comma-separated list of non-empty schema names');
  });
});

describe('Graphile realtime environment', () => {
  it.each(['dedicated', 'shared-exact'] as const)(
    'maps the explicit %s notification mode',
    (realtimeNotificationMode) => {
      expect(getGraphQLEnvVars({
        GRAPHILE_REALTIME_NOTIFICATION_MODE: realtimeNotificationMode
      }).graphile).toEqual({ realtimeNotificationMode });
    }
  );

  it('rejects unknown notification modes', () => {
    expect(() => getGraphQLEnvVars({
      GRAPHILE_REALTIME_NOTIFICATION_MODE: 'shared-prefix'
    })).toThrow("must be 'dedicated' or 'shared-exact'");
  });

  it('maps role revalidation and cursor timing intervals', () => {
    expect(getGraphQLEnvVars({
      GRAPHILE_REALTIME_NOTIFICATION_ROLE_REVALIDATION_MS: '60000',
      GRAPHILE_REALTIME_CURSOR_POLL_INTERVAL_MS: '30000',
      GRAPHILE_REALTIME_CURSOR_HEARTBEAT_INTERVAL_MS: '90000'
    }).graphile).toEqual({
      realtimeNotificationRoleRevalidationMs: 60_000,
      realtimeCursorPollIntervalMs: 30_000,
      realtimeCursorHeartbeatIntervalMs: 90_000
    });
  });

  it('maps one exact cursor-function schema', () => {
    expect(getGraphQLEnvVars({
      GRAPHILE_REALTIME_SCHEMA: ' tenant_a_realtime '
    }).graphile).toEqual({
      realtimeSchema: 'tenant_a_realtime'
    });
  });

  it('rejects a whitespace-only cursor schema', () => {
    expect(() => getGraphQLEnvVars({
      GRAPHILE_REALTIME_SCHEMA: '   '
    })).toThrow('GRAPHILE_REALTIME_SCHEMA must be one non-empty exact schema name');
  });

  it('preserves the compatibility default by omitting absent configuration', () => {
    expect(getGraphQLEnvVars({}).graphile?.realtimeSchema).toBeUndefined();
  });
});

describe('Grafast cache-limit environment', () => {
  it('maps all three schema-local cache bounds', () => {
    expect(getGraphQLEnvVars({
      GRAPHILE_QUERY_CACHE_MAX_LENGTH: '64',
      GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH: '32',
      GRAPHILE_OPERATION_PLANS_CACHE_MAX_LENGTH: '8'
    }).graphile?.grafastCache).toEqual({
      queryCacheMaxLength: 64,
      operationsCacheMaxLength: 32,
      operationOperationPlansCacheMaxLength: 8
    });
  });

  it.each(['0', '-1', '1.5', '12entries'])(
    'rejects an invalid cache bound %s',
    (value) => {
      expect(() => getGraphQLEnvVars({
        GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH: value
      })).toThrow('must be a positive safe integer');
    }
  );
});

describe('Graphile build-state retirement environment', () => {
  it.each([
    ['true', true],
    ['false', false]
  ])('maps the explicit %s value', (value, expected) => {
    expect(getGraphQLEnvVars({
      GRAPHILE_RELEASE_BUILD_STATE_AFTER_VALIDATION: value
    }).graphile?.releaseBuildStateAfterValidation).toBe(expected);
  });

  it('keeps retirement absent unless explicitly configured', () => {
    expect(
      getGraphQLEnvVars({}).graphile?.releaseBuildStateAfterValidation
    ).toBeUndefined();
  });
});

describe('Routing metadata cache environment', () => {
  it('maps the explicit process capacity', () => {
    expect(getGraphQLEnvVars({
      GRAPHQL_ROUTING_CACHE_MAX_ENTRIES: '4096'
    }).routingCache).toEqual({ maxEntries: 4096 });
  });

  it.each(['0', '-1', '1.5', '12entries'])(
    'rejects an invalid routing cache capacity %s',
    (value) => {
      expect(() => getGraphQLEnvVars({
        GRAPHQL_ROUTING_CACHE_MAX_ENTRIES: value
      })).toThrow('must be a positive safe integer');
    }
  );
});
