import type {
  ConstructiveContext,
  IdentityProviderConfig,
  SsoSurface
} from '@constructive-io/express-context';
import type { PoolClient, QueryResult } from 'pg';

import {
  completeProviderAuthentication,
  createProviderAuthorizationUrl
} from '../service';

const opaqueState = 's'.repeat(43);
const browserBinding = 'b'.repeat(64);
const verifier = 'v'.repeat(43);
const surface: SsoSurface = { privateSchema: 'tenant_acme_sso_private' };

const githubProvider: IdentityProviderConfig = {
  id: 'provider-id',
  slug: 'github-enterprise',
  kind: 'github',
  displayName: 'GitHub',
  enabled: true,
  clientId: 'client-id',
  clientSecret: 'client-secret',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userinfoUrl: 'https://api.github.com/user',
  issuerUrl: null,
  discoveryUrlOverride: null,
  discoveryDoc: null,
  jwks: null,
  jwksFetchedAt: null,
  acceptableClientIds: [],
  scopes: ['read:user', 'user:email'],
  extraAuthorizationParams: {},
  emailOptional: false,
  allowLinkByEmail: false,
  skipNonceCheck: false,
  pkceEnabled: true
};

const createContext = (results: Record<string, unknown>[]) => {
  const query = jest.fn(async (..._args: unknown[]) => ({
    rows: [{ result: results.shift() }]
  } as unknown as QueryResult));
  const client = { query } as unknown as PoolClient;
  const context = {
    useModule: jest.fn(async (name: string) => name === 'identityProviders'
      ? {
        providers: { [githubProvider.slug]: githubProvider },
        source: { schemaName: 'private', tableName: 'identity_providers' }
      }
      : undefined),
    withPgClient: jest.fn(async (callback: (pg: PoolClient) => Promise<unknown>) =>
      callback(client)
    )
  } as unknown as ConstructiveContext;
  return { context, query };
};

describe('Provider OAuth orchestration', () => {
  it('rejects malformed state before database access', async () => {
    const { context, query } = createContext([]);
    await expect(createProviderAuthorizationUrl(
      context,
      surface,
      'not-a-state',
      browserBinding
    )).rejects.toMatchObject({ code: 'INVALID_OAUTH_STATE' });
    expect(query).not.toHaveBeenCalled();
  });

  it('builds authorization through the configured adapter without exposing verifier', async () => {
    const { context } = createContext([{
      oauth_request_id: '00000000-0000-0000-0000-000000000001',
      provider_key: githubProvider.slug,
      code_verifier: verifier,
      nonce: null,
      redirect_uri: 'https://auth.example.com/auth/oauth/callback'
    }]);

    const url = await createProviderAuthorizationUrl(
      context,
      surface,
      opaqueState,
      browserBinding
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://github.com');
    expect(parsed.searchParams.get('state')).toBe(opaqueState);
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('code_challenge')).not.toBe(verifier);
    expect(url).not.toContain(verifier);
  });

  it('consumes state, mocks only Provider HTTP, and applies normalized identity', async () => {
    const { context, query } = createContext([
      {
        oauth_request_id: '00000000-0000-0000-0000-000000000001',
        provider_key: githubProvider.slug,
        code_verifier: verifier,
        nonce: null,
        redirect_uri: 'https://auth.example.com/auth/oauth/callback'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000003',
        access_token: 'cnc_auth_center_token',
        access_token_expires_at: '2026-08-10T12:00:00.000Z',
        is_verified: true,
        totp_enabled: false,
        mfa_required: false,
        continuation_url: null
      }
    ]);
    const providerFetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: 'github-server-token'
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 12345,
        login: 'octocat',
        name: 'Octo Cat',
        email: 'octo@example.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345'
      }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await completeProviderAuthentication(context, surface, {
      state: opaqueState,
      code: 'provider-authorization-code',
      providerReturnedError: false,
      browserBinding,
      requestTimeoutMs: 1000,
      fetch: providerFetch as typeof fetch
    });

    expect(result.accessToken).toBe('cnc_auth_center_token');
    expect(providerFetch).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[1]).toEqual([
      '00000000-0000-0000-0000-000000000001',
      githubProvider.slug,
      '12345',
      'octo@example.com',
      JSON.stringify({
        name: 'Octo Cat',
        username: 'octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345'
      }),
      'bearer',
      false,
      browserBinding
    ]);
  });

  it('consumes a cancelled Provider callback before returning a safe error', async () => {
    const { context, query } = createContext([{
      oauth_request_id: '00000000-0000-0000-0000-000000000001',
      provider_key: githubProvider.slug,
      code_verifier: verifier,
      nonce: null,
      redirect_uri: 'https://auth.example.com/auth/oauth/callback'
    }]);

    await expect(completeProviderAuthentication(context, surface, {
      state: opaqueState,
      providerReturnedError: true,
      browserBinding,
      requestTimeoutMs: 1000
    })).rejects.toMatchObject({ code: 'OAUTH_AUTHORIZATION_CANCELLED' });
    expect(query).toHaveBeenCalledTimes(1);
    expect(context.useModule).not.toHaveBeenCalledWith('identityProviders');
  });
});
