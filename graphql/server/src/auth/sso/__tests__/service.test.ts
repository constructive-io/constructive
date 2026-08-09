import type {
  ConstructiveContext,
  IdentityProviderConfig,
  SsoSurface
} from '@constructive-io/express-context';
import type { PoolClient, QueryResult } from 'pg';

import { createUnifiedAuthService } from '../service';

const opaque = 'a'.repeat(43);
const surface: SsoSurface = { privateSchema: 'tenant_acme_sso_private' };

const googleProvider: IdentityProviderConfig = {
  id: 'provider-id',
  slug: 'google-workspace',
  kind: 'google',
  displayName: 'Google Workspace',
  enabled: true,
  clientId: 'client-id',
  clientSecret: 'client-secret',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userinfoUrl: null,
  issuerUrl: 'https://accounts.google.com',
  discoveryUrlOverride: null,
  discoveryDoc: null,
  jwks: { keys: [] },
  jwksFetchedAt: null,
  acceptableClientIds: [],
  scopes: ['openid', 'email', 'profile'],
  extraAuthorizationParams: {},
  emailOptional: false,
  allowLinkByEmail: false,
  skipNonceCheck: false,
  pkceEnabled: true
};

const makeContext = (
  databaseResult?: Record<string, unknown>,
  options: {
    userId?: string | null;
    providers?: Record<string, IdentityProviderConfig>;
    runtime?: boolean;
  } = {}
): { context: ConstructiveContext; query: jest.Mock } => {
  const query = jest.fn(async () => ({
    rows: databaseResult === undefined ? [] : [{ result: databaseResult }]
  } as unknown as QueryResult));
  const client = { query } as unknown as PoolClient;
  const context = {
    api: {
      apiId: options.runtime
        ? '00000000-0000-0000-0000-000000000020'
        : undefined
    },
    token: options.runtime
      ? {
        id: '00000000-0000-0000-0000-000000000021',
        user_id: '00000000-0000-0000-0000-000000000022',
        principal_id: '00000000-0000-0000-0000-000000000023',
        kind: 'api_key',
        access_level: 'full_access'
      }
      : null,
    requestOrigin: 'https://auth.example.com',
    userId: options.userId ?? null,
    useModule: jest.fn(async (name: string) => {
      if (name === 'ssoSurface') return surface;
      if (name === 'identityProviders') {
        return options.providers
          ? { providers: options.providers, source: { schemaName: 'p', tableName: 'p' } }
          : undefined;
      }
      return undefined;
    }),
    withPgClient: jest.fn(async (callback: (pg: PoolClient) => Promise<unknown>) =>
      callback(client)
    )
  } as unknown as ConstructiveContext;
  return { context, query };
};

describe('unified authentication GraphQL service', () => {
  it('returns no Provider options without resolving secrets when OAuth is disabled', async () => {
    const { context } = makeContext(undefined, { providers: { google: googleProvider } });
    const service = createUnifiedAuthService(false);

    await expect(service.providers({ constructive: context })).resolves.toEqual([]);
    expect(context.useModule).not.toHaveBeenCalledWith('identityProviders');
  });

  it('returns only safe dynamic Provider display fields', async () => {
    const { context } = makeContext(undefined, {
      providers: {
        google: googleProvider,
        custom: { ...googleProvider, slug: 'custom', kind: 'custom' }
      }
    });
    const service = createUnifiedAuthService(true);

    await expect(service.providers({ constructive: context })).resolves.toEqual([
      { key: 'google-workspace', displayName: 'Google Workspace' }
    ]);
  });

  it('starts through the current Tenant SSO function and merges Provider options', async () => {
    const { context, query } = makeContext({
      transaction_id: opaque,
      site_id: '00000000-0000-0000-0000-000000000001',
      site_display_name: 'Customer Portal',
      site_icon_url: null,
      site_theme_color: '#112233',
      sign_in_mode: 'confirm',
      reusable_authentication: false,
      current_user_id: null
    }, { providers: { [googleProvider.slug]: googleProvider } });
    const service = createUnifiedAuthService(true);

    const result = await service.start(
      { constructive: context, browserBinding: opaque },
      {
        siteId: '00000000-0000-0000-0000-000000000001',
        returnTo: '/approvals/42',
        siteState: opaque
      }
    );

    expect(result.providers).toEqual([
      { key: 'google-workspace', displayName: 'Google Workspace' }
    ]);
    expect(result.site.displayName).toBe('Customer Portal');
    expect(query.mock.calls[0][0]).toContain(
      '"tenant_acme_sso_private"."start_unified_login"'
    );
    expect(query.mock.calls[0][1]).toEqual([
      '00000000-0000-0000-0000-000000000001',
      null,
      '/approvals/42',
      opaque,
      opaque
    ]);
  });

  it('uses the fixed local-password wrapper contract once', async () => {
    const { context, query } = makeContext({
      id: '00000000-0000-0000-0000-000000000010',
      user_id: '00000000-0000-0000-0000-000000000011',
      access_token: 'cnc_live_bt_secret',
      access_token_expires_at: '2026-08-10T00:00:00.000Z',
      is_verified: false,
      totp_enabled: false,
      mfa_required: false,
      callback_url: 'https://portal.example.com/auth/complete',
      site_state: opaque,
      handoff_expires_at: '2026-08-10T00:01:00.000Z'
    });
    const service = createUnifiedAuthService(false);

    const result = await service.signIn(
      { constructive: context, browserBinding: opaque },
      {
        transactionId: opaque,
        email: 'user@example.com',
        password: 'correct horse battery staple',
        rememberMe: true
      }
    );

    expect(result.accessToken).toBe('cnc_live_bt_secret');
    expect(result.continuationUrl).toMatch(
      /^https:\/\/portal\.example\.com\/auth\/complete\?handoff=[A-Za-z0-9_-]{43}&site_state=/
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain(
      '"tenant_acme_sso_private"."sign_in_unified_login"'
    );
    expect(query.mock.calls[0][1]).toEqual([
      opaque,
      'user@example.com',
      'correct horse battery staple',
      true,
      'bearer',
      opaque,
      null,
      expect.stringMatching(/^\\x[0-9a-f]{64}$/)
    ]);
  });

  it('creates the same handoff continuation for reusable authentication', async () => {
    const { context, query } = makeContext({
      user_id: '00000000-0000-0000-0000-000000000011',
      callback_url: 'https://portal.example.com/auth/complete',
      site_state: opaque,
      handoff_expires_at: '2026-08-10T00:01:00.000Z'
    }, { userId: '00000000-0000-0000-0000-000000000011' });
    const service = createUnifiedAuthService(false);

    const result = await service.confirm(
      { constructive: context, browserBinding: opaque },
      { transactionId: opaque }
    );

    expect(result.continuationUrl).toMatch(
      /^https:\/\/portal\.example\.com\/auth\/complete\?handoff=/
    );
    expect(query.mock.calls[0][0]).toContain(
      '"tenant_acme_sso_private"."confirm_unified_login"'
    );
    expect(query.mock.calls[0][1]).toEqual([
      opaque,
      opaque,
      expect.stringMatching(/^\\x[0-9a-f]{64}$/)
    ]);
  });

  it('creates the shared handoff through the registration wrapper', async () => {
    const { context, query } = makeContext({
      id: '00000000-0000-0000-0000-000000000010',
      user_id: '00000000-0000-0000-0000-000000000011',
      access_token: 'cnc_live_bt_registration',
      access_token_expires_at: '2026-08-10T00:00:00.000Z',
      is_verified: false,
      totp_enabled: false,
      mfa_required: false,
      callback_url: 'https://portal.example.com/auth/complete',
      site_state: opaque,
      handoff_expires_at: '2026-08-10T00:01:00.000Z'
    });
    const service = createUnifiedAuthService(false);

    await expect(service.signUp(
      { constructive: context, browserBinding: opaque },
      {
        transactionId: opaque,
        email: 'new@example.com',
        password: 'correct horse battery staple'
      }
    )).resolves.toMatchObject({
      accessToken: 'cnc_live_bt_registration',
      continuationUrl: expect.stringMatching(/handoff=/)
    });
    expect(query.mock.calls[0][0]).toContain(
      '"tenant_acme_sso_private"."sign_up_unified_login"'
    );
  });

  it('redeems through an authenticated routed Site runtime API key', async () => {
    const { context, query } = makeContext({
      id: '00000000-0000-0000-0000-000000000030',
      user_id: '00000000-0000-0000-0000-000000000031',
      access_token: 'cnc_live_bt_site',
      access_token_expires_at: '2026-08-10T01:00:00.000Z',
      is_verified: true,
      totp_enabled: false,
      mfa_required: false,
      return_to: '/approvals/42'
    }, { runtime: true });
    const service = createUnifiedAuthService(false);
    const handoffCode = 'h'.repeat(43);

    await expect(service.redeem(
      { constructive: context },
      { handoffCode }
    )).resolves.toMatchObject({
      accessToken: 'cnc_live_bt_site',
      returnTo: '/approvals/42'
    });
    expect(query.mock.calls[0][0]).toContain(
      '"tenant_acme_sso_private"."redeem_sso_handoff"'
    );
    expect(query.mock.calls[0][1]).toEqual([
      expect.stringMatching(/^\\x[0-9a-f]{64}$/)
    ]);
  });

  it('does not let an auth-center browser credential redeem a Site handoff', async () => {
    const { context, query } = makeContext();
    const service = createUnifiedAuthService(false);

    await expect(service.redeem(
      { constructive: context },
      { handoffCode: 'h'.repeat(43) }
    )).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(query).not.toHaveBeenCalled();
  });

  it('starts Provider authentication without exposing transaction or PKCE secrets', async () => {
    const { context, query } = makeContext({
      oauth_request_id: '00000000-0000-0000-0000-000000000099'
    }, { providers: { [googleProvider.slug]: googleProvider } });
    const service = createUnifiedAuthService(true);

    const result = await service.startProvider(
      {
        constructive: context,
        browserBinding: opaque
      },
      { transactionId: opaque, providerKey: googleProvider.slug }
    );

    expect(result.authorizationUrl).toMatch(
      /^\/auth\/oauth\/authorize\?state=[A-Za-z0-9_-]{43}$/
    );
    expect(result.authorizationUrl).not.toContain(opaque);
    expect(query.mock.calls[0][0]).toContain(
      '"tenant_acme_sso_private"."start_provider_oauth_request"'
    );
    expect(query.mock.calls[0][1]).toEqual([
      opaque,
      googleProvider.slug,
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      'https://auth.example.com/auth/oauth/callback',
      opaque
    ]);
  });

  it('keeps the Provider-start field stable but fails while OAuth is disabled', async () => {
    const { context, query } = makeContext();
    const service = createUnifiedAuthService(false);
    await expect(service.startProvider(
      { constructive: context, browserBinding: opaque },
      { transactionId: opaque, providerKey: googleProvider.slug }
    )).rejects.toMatchObject({ code: 'OAUTH_SIGN_IN_DISABLED' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin return target before database access', async () => {
    const { context, query } = makeContext();
    const service = createUnifiedAuthService(false);

    await expect(service.start(
      { constructive: context, browserBinding: opaque },
      {
        siteId: '00000000-0000-0000-0000-000000000001',
        returnTo: 'https://evil.example/steal',
        siteState: opaque
      }
    )).rejects.toMatchObject({ code: 'INVALID_SSO_RETURN_TARGET' });
    expect(query).not.toHaveBeenCalled();
  });

  it('requires the server-read first-party browser binding', async () => {
    const { context, query } = makeContext();
    const service = createUnifiedAuthService(false);

    await expect(service.start(
      { constructive: context },
      {
        siteId: '00000000-0000-0000-0000-000000000001',
        siteState: opaque
      }
    )).rejects.toMatchObject({ code: 'INVALID_SSO_SITE_STATE' });
    expect(query).not.toHaveBeenCalled();
  });
});
