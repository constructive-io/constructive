import type { Pool } from 'pg';

import { authSettingsLoader } from '../../src/loaders/auth-settings';
import { authSurfaceLoader } from '../../src/loaders/auth-surface';
import {
  identityProvidersLoader,
  requireIdentityProvider
} from '../../src/loaders/identity-providers';
import type { LoaderContext } from '../../src/loaders/types';
import type { IdentityProvidersModule } from '../../src/types';

interface Call {
  text: string;
  values?: unknown[];
}

/**
 * A pool that answers each query in turn and records what it was asked. The
 * loaders' whole job is issuing the right SQL with the right binding, so the
 * calls are the assertion target.
 */
const fakePool = (responses: Array<{ rows: unknown[] }>) => {
  const calls: Call[] = [];
  let i = 0;
  const pool = {
    query: jest.fn(async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      const next = responses[i++];
      if (!next) throw new Error(`unexpected query #${i}: ${text}`);
      return next;
    })
  } as unknown as Pool;
  return { pool, calls };
};

const ctx = (tenantPool: Pool, databaseId = 'db-1'): LoaderContext => ({
  routingPool: {} as Pool,
  tenantPool,
  databaseId,
  dbname: 'tenant'
});

beforeEach(() => {
  authSettingsLoader.invalidate();
  authSurfaceLoader.invalidate();
  identityProvidersLoader.invalidate();
});

describe('authSettingsLoader', () => {
  it('discovers the settings table for the context database only', async () => {
    const { pool, calls } = fakePool([
      { rows: [{ schema_name: 'tenant_a_auth', table_name: 'auth_settings' }] },
      { rows: [{ cookie_secure: true, cookie_samesite: 'lax', cookie_path: '/' }] }
    ]);

    const settings = await authSettingsLoader.resolve(ctx(pool, 'db-a'));

    expect(calls[0].values).toEqual(['db-a']);
    expect(calls[0].text).toMatch(/WHERE sm\.database_id = \$1/);
    // Step 2 reads out of the schema step 1 resolved — which is precisely why
    // step 1 being keyed matters.
    expect(calls[1].text).toContain('"tenant_a_auth"."auth_settings"');
    expect(settings).toMatchObject({ cookieSecure: true, cookieSamesite: 'lax' });
  });

  it('is undefined when the tenant provisions no sessions module', async () => {
    const { pool } = fakePool([{ rows: [] }]);
    await expect(authSettingsLoader.resolve(ctx(pool))).resolves.toBeUndefined();
  });

  it('refuses a context with no databaseId rather than running unkeyed', async () => {
    const { pool, calls } = fakePool([]);
    await expect(authSettingsLoader.resolve(ctx(pool, ''))).rejects.toThrow(/no databaseId/);
    expect(calls).toHaveLength(0);
  });
});

describe('authSurfaceLoader', () => {
  it('resolves the tenant auth schemas in one keyed round trip', async () => {
    const { pool, calls } = fakePool([
      {
        rows: [
          {
            private_schema: 'tenant_a_auth_private',
            public_schema: 'tenant_a_auth_public',
            identifiers_public_schema: 'tenant_a_identifiers',
            emails_table: 'emails',
            connected_accounts_view: 'user_connected_accounts'
          }
        ]
      }
    ]);

    const surface = await authSurfaceLoader.resolve(ctx(pool, 'db-a'));

    expect(calls).toHaveLength(1);
    expect(calls[0].values).toEqual(['db-a']);
    expect(surface).toEqual({
      privateSchema: 'tenant_a_auth_private',
      publicSchema: 'tenant_a_auth_public',
      identifiersPublicSchema: 'tenant_a_identifiers',
      emailsTable: 'emails',
      connectedAccountsView: 'user_connected_accounts'
    });
  });

  it('joins the companion modules within the same tenant', async () => {
    const { pool, calls } = fakePool([{ rows: [] }]);
    await authSurfaceLoader.resolve(ctx(pool));
    // A join on schema id alone would pair one tenant's providers with
    // another's connected accounts and still return a plausible row.
    expect(calls[0].text).toMatch(/connected\.database_id = providers\.database_id/);
    expect(calls[0].text).toMatch(/emails\.database_id = providers\.database_id/);
  });
});

describe('identityProvidersLoader', () => {
  const providerRow: Record<string, unknown> = {
    id: 'p1',
    slug: 'google',
    kind: 'oidc',
    display_name: 'Google',
    enabled: true,
    client_id: 'client-abc',
    client_secret: 'shh',
    authorization_url: null,
    token_url: null,
    userinfo_url: null,
    issuer_url: 'https://accounts.google.com',
    discovery_url_override: null,
    discovery_doc: null,
    jwks: null,
    jwks_fetched_at: null,
    acceptable_client_ids: null,
    scopes: ['openid', 'email'],
    extra_authorization_params: null,
    email_optional: null,
    allow_link_by_email: null,
    skip_nonce_check: null,
    pkce_enabled: null
  };

  const provisioned = (rows: unknown[]) => [
    {
      rows: [{
        schema_name: 'tenant_a_auth_private',
        table_name: 'identity_providers',
        scope: 'database',
        prefix: ''
      }]
    },
    {
      rows: [{
        schema_name: 'tenant_a_secrets',
        table_name: 'internal_secrets',
        scope: 'database',
        prefix: ''
      }]
    },
    { rows }
  ];

  it('keys both discovery steps and inlines the tenant secret getter', async () => {
    const { pool, calls } = fakePool(provisioned([providerRow]));

    const module = await identityProvidersLoader.resolve(ctx(pool, 'db-a'));

    expect(calls[0].values).toEqual(['db-a']);
    expect(calls[1].values).toEqual(['db-a', 'database']);
    expect(calls[2].text).toContain('"tenant_a_secrets"."_internal_secrets_get"');
    expect(calls[2].text).toContain('"tenant_a_auth_private"."identity_providers"');
    expect(calls[2].values).toEqual(['db-a']);
    expect(module?.providers.google).toMatchObject({
      clientId: 'client-abc',
      clientSecret: 'shh',
      issuerUrl: 'https://accounts.google.com'
    });
  });

  it('defaults an unset nonce/PKCE policy to the safe side', async () => {
    const { pool } = fakePool(provisioned([providerRow]));
    const module = await identityProvidersLoader.resolve(ctx(pool));
    expect(module?.providers.google).toMatchObject({ skipNonceCheck: false, pkceEnabled: true });
  });

  it('fails when the secret store is absent instead of yielding a secretless client', async () => {
    const { pool } = fakePool([
      {
        rows: [{
          schema_name: 'tenant_a_auth_private',
          table_name: 'identity_providers',
          scope: 'database',
          prefix: ''
        }]
      },
      { rows: [] }
    ]);
    await expect(identityProvidersLoader.resolve(ctx(pool))).rejects.toThrow(
      /internal_secrets_module/
    );
  });

  it('is undefined when the tenant provisions no providers module', async () => {
    const { pool } = fakePool([{ rows: [] }]);
    await expect(identityProvidersLoader.resolve(ctx(pool))).resolves.toBeUndefined();
  });

  it('rejects a provider row with no client_id', async () => {
    const { pool } = fakePool(provisioned([{ ...providerRow, client_id: null }]));
    await expect(identityProvidersLoader.resolve(ctx(pool))).rejects.toThrow(/client_id is not set/);
  });
});

describe('requireIdentityProvider', () => {
  const module = (enabled: boolean): IdentityProvidersModule => ({
    providers: { google: { slug: 'google', enabled } as IdentityProvidersModule['providers'][string] },
    source: { schemaName: 's', tableName: 't' }
  });

  it('returns the provider when configured and enabled', () => {
    expect(requireIdentityProvider(module(true), 'google').slug).toBe('google');
  });

  it('distinguishes unprovisioned, unknown and disabled', () => {
    expect(() => requireIdentityProvider(undefined, 'google')).toThrow(/not provisioned/);
    expect(() => requireIdentityProvider(module(true), 'okta')).toThrow(/not configured/);
    expect(() => requireIdentityProvider(module(false), 'google')).toThrow(/disabled/);
  });
});
