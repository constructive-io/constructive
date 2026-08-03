import type { Pool } from 'pg';

import {
  buildProvidersSql,
  identityProvidersLoader,
  resolveIdentityProvidersConfig
} from '../identity-providers';
import type { LoaderContext } from '../types';
import { userAuthModuleLoader } from '../user-auth-module';

type QueryResult = { rows: unknown[] };
type QueryHandler = (sql: string, values?: unknown[]) => QueryResult;

function createMockPool(handlers: QueryHandler[]) {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const query = jest.fn(async (sql: string, values?: unknown[]) => {
    queries.push({ sql, values });
    const handler = handlers.shift();
    if (!handler) {
      throw new Error(`Unexpected query: ${sql}`);
    }
    return handler(sql, values);
  });

  return {
    pool: { query } as unknown as Pool,
    queries
  };
}

function createContext(
  tenantPool: Pool,
  databaseId = 'tenant-db',
  routingPool: Pool = { query: jest.fn() } as unknown as Pool
): LoaderContext {
  return {
    routingPool,
    tenantPool,
    databaseId,
    apiId: 'api-id',
    dbname: 'constructive-test'
  };
}

function identityProvidersModuleRow(databaseId: string, scope: string) {
  return {
    database_id: databaseId,
    schema_name: 'auth_public',
    private_schema_name: 'auth_private',
    table_name: 'identity_providers',
    scope,
    prefix: scope
  };
}

describe('identityProvidersLoader metadata resolution', () => {
  afterEach(() => {
    identityProvidersLoader.invalidate();
  });

  it('loads database-owned provider config through internal secrets metadata', async () => {
    const tenant = createMockPool([
      () => ({ rows: [identityProvidersModuleRow('tenant-db', 'app')] }),
      () => ({
        rows: [{ internal_secrets_table_id: 'secrets-table-id' }]
      }),
      () => ({
        rows: [
          {
            schema_name: 'secret_private',
            table_name: 'app_secrets'
          }
        ]
      }),
      () => ({
        rows: [
          {
            slug: 'github',
            kind: 'oauth2',
            display_name: 'GitHub',
            enabled: true,
            client_id: 'dummy-client-id',
            client_secret: 'dummy-client-secret',
            authorization_url: 'https://github.example/authorize',
            token_url: 'https://github.example/token',
            userinfo_url: 'https://github.example/user',
            scopes: ['read:user'],
            extra_authorization_params: { prompt: 'select_account' },
            pkce_enabled: true
          }
        ]
      })
    ]);
    const routing = createMockPool([]);

    const config = await resolveIdentityProvidersConfig(
      createContext(tenant.pool, 'tenant-db', routing.pool)
    );

    expect(config).toMatchObject({
      schemaName: 'auth_public',
      privateSchemaName: 'auth_private',
      tableName: 'identity_providers',
      scope: 'app',
      prefix: 'app',
      rotateSecretFunction: 'rotate_identity_provider_app_secret'
    });
    expect(config?.providers.get('github')).toMatchObject({
      clientId: 'dummy-client-id',
      clientSecret: 'dummy-client-secret',
      authorizationUrl: 'https://github.example/authorize',
      authorizationParams: { prompt: 'select_account' }
    });
    expect(routing.queries).toHaveLength(0);
    expect(tenant.queries[0].values).toEqual(['tenant-db']);
    expect(tenant.queries[1].sql).toContain('internal_secrets_module');
    expect(tenant.queries[1].values).toEqual(['tenant-db', 'app']);
    expect(tenant.queries[2].sql).toContain('metaschema.schema_and_table');
    expect(tenant.queries[3].sql).toContain('secret_private.app_secrets');
    expect(tenant.queries.map(({ sql }) => sql).join('\n')).not.toContain(
      'services_public'
    );
    expect(tenant.queries.map(({ sql }) => sql).join('\n')).not.toContain(
      'config_secrets_module'
    );
  });

  it('returns undefined when identity providers are not provisioned', async () => {
    const tenant = createMockPool([() => ({ rows: [] })]);

    await expect(
      resolveIdentityProvidersConfig(createContext(tenant.pool))
    ).resolves.toBeUndefined();
    expect(tenant.queries).toHaveLength(1);
  });

  it('rejects ambiguous provider ownership within one database', async () => {
    const tenant = createMockPool([
      () => ({
        rows: [
          identityProvidersModuleRow('tenant-db', 'app'),
          identityProvidersModuleRow('tenant-db', 'platform')
        ]
      })
    ]);

    await expect(
      resolveIdentityProvidersConfig(createContext(tenant.pool))
    ).rejects.toThrow(
      'multiple identity_providers_module rows found for database tenant-db'
    );
    expect(tenant.queries).toHaveLength(1);
  });

  it('throws when the matching internal secrets scope is missing', async () => {
    const tenant = createMockPool([
      () => ({ rows: [identityProvidersModuleRow('tenant-db', 'app')] }),
      () => ({ rows: [] })
    ]);

    await expect(
      resolveIdentityProvidersConfig(createContext(tenant.pool))
    ).rejects.toThrow(
      'internal_secrets_module missing for scope app on database tenant-db'
    );
  });

  it('throws when the internal secrets table id cannot be resolved', async () => {
    const tenant = createMockPool([
      () => ({ rows: [identityProvidersModuleRow('tenant-db', 'app')] }),
      () => ({
        rows: [{ internal_secrets_table_id: 'missing-table-id' }]
      }),
      () => {
        throw new Error('NOT_FOUND');
      }
    ]);

    await expect(
      resolveIdentityProvidersConfig(createContext(tenant.pool))
    ).rejects.toThrow(
      'schema/table resolution missing for internal_secrets_module scope app on database tenant-db'
    );
  });

  it('builds provider SQL from resolved identifiers', () => {
    const sql = buildProvidersSql(
      'auth_private',
      'identity_providers',
      'secret_private',
      'app_secrets'
    );

    expect(sql).toContain('auth_private.identity_providers');
    expect(sql).toContain('secret_private.app_secrets');
    expect(sql).not.toContain('constructive_store_private');
    expect(sql).not.toContain('platform_secrets');
  });
});

describe('userAuthModuleLoader', () => {
  afterEach(() => {
    userAuthModuleLoader.invalidate();
  });

  it('resolves identity auth function constants', async () => {
    const tenant = createMockPool([
      () => ({
        rows: [
          {
            schema_name: 'auth_public',
            session_credentials_schema_name: 'session_private',
            sign_in_function: 'sign_in',
            sign_up_function: 'sign_up',
            sign_out_function: 'sign_out',
            sign_in_cross_origin_function: null,
            request_cross_origin_token_function: null,
            extend_token_expires: '1 hour'
          }
        ]
      }),
      () => ({ rows: [{ schema_name: 'auth_private' }] })
    ]);

    const config = await userAuthModuleLoader.resolve(
      createContext(tenant.pool, 'user-auth-db')
    );

    expect(config).toMatchObject({
      schemaName: 'auth_public',
      identityFunctionSchemaName: 'auth_private',
      sessionCredentialsSchemaName: 'session_private',
      signInIdentityFunction: 'sign_in_identity',
      signUpIdentityFunction: 'sign_up_identity'
    });
  });

  it('falls back to the public auth schema when identity functions are not discoverable', async () => {
    const tenant = createMockPool([
      () => ({
        rows: [
          {
            schema_name: 'auth_public',
            session_credentials_schema_name: null,
            sign_in_function: 'sign_in',
            sign_up_function: 'sign_up',
            sign_out_function: 'sign_out',
            sign_in_cross_origin_function: null,
            request_cross_origin_token_function: null,
            extend_token_expires: '1 hour'
          }
        ]
      }),
      () => ({ rows: [] })
    ]);

    const config = await userAuthModuleLoader.resolve(
      createContext(tenant.pool, 'fallback-user-auth-db')
    );

    expect(config).toMatchObject({
      schemaName: 'auth_public',
      identityFunctionSchemaName: 'auth_public',
      sessionCredentialsSchemaName: 'auth_public'
    });
  });
});
