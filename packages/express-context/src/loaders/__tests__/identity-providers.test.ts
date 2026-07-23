import type { LoaderContext } from '../types';
import {
  buildProvidersSql,
  resolveIdentityProvidersConfig,
} from '../identity-providers';
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
    pool: { query },
    queries,
  };
}

function createContext(
  servicesPool: ReturnType<typeof createMockPool>['pool'],
  tenantPool: ReturnType<typeof createMockPool>['pool'],
  databaseId = 'tenant-db',
): LoaderContext {
  return {
    servicesPool,
    tenantPool,
    databaseId,
    dbname: 'constructive-test',
  } as unknown as LoaderContext;
}

function identityProvidersModuleRow(databaseId: string, scope: string) {
  return {
    database_id: databaseId,
    schema_name: 'auth_public',
    private_schema_name: 'auth_private',
    table_name: 'identity_providers',
    scope,
    prefix: scope,
  };
}

describe('identityProvidersLoader metadata resolution', () => {
  it('resolves provider secrets table through internal_secrets_module schema metadata', async () => {
    const tenant = createMockPool([
      () => ({ rows: [identityProvidersModuleRow('tenant-db', 'app')] }),
    ]);
    const services = createMockPool([
      () => ({ rows: [{ database_id: 'platform-db' }] }),
      () => ({ rows: [identityProvidersModuleRow('platform-db', 'platform')] }),
      () => ({ rows: [{ internal_secrets_table_id: 'secrets-table-id' }] }),
      () => ({
        rows: [
          {
            schema_name: 'secret_private',
            table_name: 'resolved_secrets',
          },
        ],
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
            pkce_enabled: true,
          },
        ],
      }),
    ]);

    const config = await resolveIdentityProvidersConfig(
      createContext(services.pool, tenant.pool),
    );

    expect(config?.providers.get('github')).toMatchObject({
      clientId: 'dummy-client-id',
      clientSecret: 'dummy-client-secret',
      authorizationUrl: 'https://github.example/authorize',
      authorizationParams: { prompt: 'select_account' },
    });
    expect(services.queries[0].values).toEqual(['constructive-test']);
    expect(services.queries[2].sql).toContain('internal_secrets_module');
    expect(services.queries[2].values).toEqual(['platform-db', 'platform']);
    expect(services.queries[4].sql).toContain('secret_private.resolved_secrets');
    expect(services.queries[4].sql).not.toContain(
      'constructive_store_private',
    );
    expect(services.queries[4].sql).not.toContain('platform_secrets');
  });

  it('builds provider SQL without the old platform secrets hardcode', () => {
    const sql = buildProvidersSql(
      'auth_private',
      'identity_providers',
      'secret_private',
      'resolved_secrets',
    );

    expect(sql).toContain('auth_private.identity_providers');
    expect(sql).toContain('secret_private.resolved_secrets');
    expect(sql).not.toContain('constructive_store_private');
    expect(sql).not.toContain('platform_secrets');
  });

  it('throws a clear error when internal_secrets_module is missing for scope', async () => {
    const tenant = createMockPool([
      () => ({ rows: [identityProvidersModuleRow('tenant-db', 'app')] }),
    ]);
    const services = createMockPool([
      () => ({ rows: [{ database_id: 'platform-db' }] }),
      () => ({ rows: [identityProvidersModuleRow('platform-db', 'platform')] }),
      () => ({ rows: [] }),
    ]);

    await expect(
      resolveIdentityProvidersConfig(createContext(services.pool, tenant.pool)),
    ).rejects.toThrow(
      'internal_secrets_module missing for scope platform on database platform-db',
    );
  });

  it('throws a clear error when internal_secrets_module table resolution fails', async () => {
    const tenant = createMockPool([
      () => ({ rows: [identityProvidersModuleRow('tenant-db', 'app')] }),
    ]);
    const services = createMockPool([
      () => ({ rows: [{ database_id: 'platform-db' }] }),
      () => ({ rows: [identityProvidersModuleRow('platform-db', 'platform')] }),
      () => ({ rows: [{ internal_secrets_table_id: 'missing-table-id' }] }),
      () => {
        throw new Error('NOT_FOUND');
      },
    ]);

    await expect(
      resolveIdentityProvidersConfig(createContext(services.pool, tenant.pool)),
    ).rejects.toThrow(
      'schema/table resolution missing for internal_secrets_module scope platform on database platform-db',
    );
  });
});

describe('userAuthModuleLoader', () => {
  afterEach(() => {
    userAuthModuleLoader.invalidate();
  });

  it('continues resolving identity auth function constants', async () => {
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
            extend_token_expires: '1 hour',
          },
        ],
      }),
      () => ({
        rows: [
          {
            schema_name: 'auth_private',
          },
        ],
      }),
    ]);
    const services = createMockPool([]);

    const config = await userAuthModuleLoader.resolve(
      createContext(services.pool, tenant.pool, 'user-auth-db'),
    );

    expect(config).toMatchObject({
      schemaName: 'auth_public',
      identityFunctionSchemaName: 'auth_private',
      sessionCredentialsSchemaName: 'session_private',
      signInIdentityFunction: 'sign_in_identity',
      signUpIdentityFunction: 'sign_up_identity',
    });
  });

  it('falls back to the public auth schema when identity function schema is not discoverable', async () => {
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
            extend_token_expires: '1 hour',
          },
        ],
      }),
      () => ({ rows: [] }),
    ]);
    const services = createMockPool([]);

    const config = await userAuthModuleLoader.resolve(
      createContext(services.pool, tenant.pool, 'fallback-user-auth-db'),
    );

    expect(config).toMatchObject({
      schemaName: 'auth_public',
      identityFunctionSchemaName: 'auth_public',
      sessionCredentialsSchemaName: 'auth_public',
    });
  });
});
