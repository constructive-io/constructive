import { createHash } from 'node:crypto';

import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import {
  REAL_RUNTIME_FIXTURE,
  seedRealUnifiedAuthRuntime
} from '../__fixtures__/seed/oauth-sso/real-runtime';
import {
  getConnections,
  getConstructiveDbApplicationPath,
  seed
} from '../src';

jest.setTimeout(600_000);

const constructiveDbApplicationPath = getConstructiveDbApplicationPath();
const describeRealRuntime = constructiveDbApplicationPath ? describe : describe.skip;
const browserBinding = 'b'.repeat(43);
const siteState = 's'.repeat(43);

const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

interface RuntimeMetadata {
  database_id: string;
  private_schema: string;
  sessions_schema: string;
  sessions_table: string;
  credentials_table: string;
  site_api_id: string;
}

const quoteIdentifier = (value: string): string =>
  `"${value.replaceAll('"', '""')}"`;

describeRealRuntime('OAuth/SSO generated Constructive DB integration', () => {
  let request: supertest.Agent;
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  let runtime: RuntimeMetadata;

  const postGraphQL = (
    host: string,
    query: string,
    variables?: Record<string, unknown>,
    token?: string
  ) => {
    const pending = request
      .post('/graphql')
      .set('Host', host)
      .set('X-Forwarded-Proto', 'https')
      .set('Cookie', `csrf_token=${browserBinding}`);
    if (token) pending.set('Authorization', `Bearer ${token}`);
    return pending.send({ query, variables });
  };

  const startLogin = (token?: string) => postGraphQL(
    REAL_RUNTIME_FIXTURE.authHost,
    `mutation Start($input: StartUnifiedLoginInput!) {
      startUnifiedLogin(input: $input) {
        transactionId
        reusableAuthentication
        currentAccount { id displayName }
        site { id displayName themeColor }
        providers { key }
      }
    }`,
    {
      input: {
        siteId: REAL_RUNTIME_FIXTURE.siteId,
        returnTo: '/approvals/42',
        siteState
      }
    },
    token
  );

  beforeAll(async () => {
    if (!constructiveDbApplicationPath) {
      throw new Error('The real Constructive DB application path is required.');
    }
    ({ request, pg, teardown } = await getConnections(
      {
        schemas: ['constructive_public'],
        authRole: 'anonymous',
        server: {
          useRouting: true,
          trustProxy: true,
          oauth: {
            enabled: true,
            providerRequestTimeoutMs: 2_000
          },
          api: {
            isPublic: true,
            metaSchemas
          }
        }
      },
      [
        seed.pgpm(constructiveDbApplicationPath),
        seedRealUnifiedAuthRuntime()
      ]
    ));
    runtime = await pg.one<RuntimeMetadata>(
      'SELECT * FROM public.oauth_sso_real_runtime_fixture'
    );
  });

  afterAll(async () => teardown());

  it('routes the auth center without Site identity and the Site with trusted runtime_site_id', async () => {
    const rows = await pg.any<{
      hostname: string;
      runtime_site_id: string | null;
    }>(
      `SELECT $1::text AS hostname, runtime_site_id
       FROM routing_public.resolve_route($1, '/', NULL)
       UNION ALL
       SELECT $2::text AS hostname, runtime_site_id
       FROM routing_public.resolve_route($2, '/', NULL)`,
      [REAL_RUNTIME_FIXTURE.authHost, REAL_RUNTIME_FIXTURE.siteHost]
    );
    expect(rows).toEqual([
      { hostname: REAL_RUNTIME_FIXTURE.authHost, runtime_site_id: null },
      {
        hostname: REAL_RUNTIME_FIXTURE.siteHost,
        runtime_site_id: REAL_RUNTIME_FIXTURE.siteId
      }
    ]);

    const unknownHost = await postGraphQL(
      'unknown.example.test',
      `mutation Start($input: StartUnifiedLoginInput!) {
        startUnifiedLogin(input: $input) { transactionId }
      }`,
      { input: { siteId: REAL_RUNTIME_FIXTURE.siteId, siteState } }
    );
    expect(unknownHost.status).toBe(404);
  });

  it('runs signup, reusable auth, handoff redemption, replay protection, and revocation end to end', async () => {
    const startResponse = await startLogin();
    expect(startResponse.status).toBe(200);
    expect(startResponse.body.errors).toBeUndefined();
    const transactionId = startResponse.body.data.startUnifiedLogin.transactionId as string;
    expect(transactionId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(startResponse.body.data.startUnifiedLogin).toMatchObject({
      reusableAuthentication: false,
      currentAccount: null,
      site: {
        id: REAL_RUNTIME_FIXTURE.siteId,
        displayName: 'Customer Portal'
      },
      providers: [{ key: 'github' }]
    });

    const transactionRows = await pg.any<{
      token_hash: Buffer;
      return_to: string;
    }>(
      `SELECT token_hash, return_to
       FROM ${quoteIdentifier(runtime.private_schema)}.unified_login_transactions`
    );
    expect(transactionRows).toHaveLength(1);
    expect(transactionRows[0].token_hash.toString('hex')).toBe(
      createHash('sha256').update(transactionId).digest('hex')
    );
    expect(transactionRows[0].return_to).toBe('/approvals/42');

    const signup = await postGraphQL(
      REAL_RUNTIME_FIXTURE.authHost,
      `mutation SignUp($input: UnifiedPasswordInput!) {
        signUpUnifiedLogin(input: $input) {
          credentialId
          userId
          accessToken
          continuationUrl
        }
      }`,
      {
        input: {
          transactionId,
          email: 'unified-user@example.com',
          password: 'Str0ngP@ssword!'
        }
      }
    );
    expect(signup.status).toBe(200);
    expect(signup.body.errors).toBeUndefined();
    const central = signup.body.data.signUpUnifiedLogin as {
      credentialId: string;
      userId: string;
      accessToken: string;
      continuationUrl: string;
    };
    expect(central.accessToken).toMatch(/^cnc_live_bt_/);

    const centralCookies = (signup.headers['set-cookie'] ?? []) as string[];
    expect(centralCookies).toEqual(expect.arrayContaining([
      expect.stringContaining('constructive_session=')
    ]));
    const centralCookie = centralCookies.find(value =>
      value.startsWith('constructive_session=')
    ) as string;
    expect(centralCookie).toContain('Secure');
    expect(centralCookie).toContain('HttpOnly');
    expect(centralCookie).not.toContain('Domain=');

    const continuation = new URL(central.continuationUrl);
    const handoff = continuation.searchParams.get('handoff');
    expect(continuation.origin).toBe(`https://${REAL_RUNTIME_FIXTURE.siteHost}`);
    expect(continuation.pathname).toBe('/auth/complete');
    expect(continuation.searchParams.get('site_state')).toBe(siteState);
    expect(handoff).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(continuation.toString()).not.toContain(central.accessToken);

    const storedHandoff = await pg.one<{ code_hash: Buffer }>(
      `SELECT code_hash
       FROM ${quoteIdentifier(runtime.private_schema)}.sso_handoffs`
    );
    expect(storedHandoff.code_hash.toString('hex')).toBe(
      createHash('sha256').update(handoff as string).digest('hex')
    );

    const reusable = await startLogin(central.accessToken);
    expect(reusable.body.errors).toBeUndefined();
    expect(reusable.body.data.startUnifiedLogin).toMatchObject({
      reusableAuthentication: true,
      currentAccount: { id: central.userId }
    });

    const redeem = await postGraphQL(
      REAL_RUNTIME_FIXTURE.siteHost,
      `mutation Redeem($input: RedeemUnifiedLoginHandoffInput!) {
        redeemUnifiedLoginHandoff(input: $input) {
          credentialId
          userId
          accessToken
          returnTo
        }
      }`,
      { input: { handoffCode: handoff } },
      REAL_RUNTIME_FIXTURE.serviceApiKey
    );
    expect(redeem.body.errors).toBeUndefined();
    const siteCredential = redeem.body.data.redeemUnifiedLoginHandoff as {
      credentialId: string;
      userId: string;
      accessToken: string;
      returnTo: string;
    };
    expect(siteCredential).toMatchObject({
      userId: central.userId,
      returnTo: '/approvals/42'
    });
    expect(siteCredential.accessToken).toMatch(/^cnc_live_bt_/);
    expect(siteCredential.accessToken).not.toBe(central.accessToken);
    // Constructive returns a distinct Site credential to the authenticated Site
    // server; only that Site's own callback response may write its first-party
    // cookie on the Site domain.
    expect(redeem.headers['set-cookie']).toBeUndefined();

    const replay = await postGraphQL(
      REAL_RUNTIME_FIXTURE.siteHost,
      `mutation Redeem($input: RedeemUnifiedLoginHandoffInput!) {
        redeemUnifiedLoginHandoff(input: $input) { accessToken }
      }`,
      { input: { handoffCode: handoff } },
      REAL_RUNTIME_FIXTURE.serviceApiKey
    );
    expect(replay.body.data).toBeNull();
    expect(replay.body.errors[0].extensions.code).toBe('SSO_HANDOFF_ALREADY_USED');

    const protectedBeforeRevocation = await postGraphQL(
      REAL_RUNTIME_FIXTURE.siteHost,
      'query SiteSession { __typename }',
      undefined,
      siteCredential.accessToken
    );
    expect(protectedBeforeRevocation.body).toEqual({
      data: { __typename: 'Query' }
    });

    const centralSession = await pg.one<{ session_id: string }>(
      `SELECT session_id
       FROM ${quoteIdentifier(runtime.sessions_schema)}.${quoteIdentifier(runtime.credentials_table)}
       WHERE id = $1`,
      [central.credentialId]
    );
    await pg.any(
      `UPDATE ${quoteIdentifier(runtime.sessions_schema)}.${quoteIdentifier(runtime.sessions_table)}
       SET revoked_at = clock_timestamp()
       WHERE id = $1`,
      [centralSession.session_id]
    );

    const protectedAfterRevocation = await postGraphQL(
      REAL_RUNTIME_FIXTURE.siteHost,
      'query RevokedSiteSession { __typename }',
      undefined,
      siteCredential.accessToken
    );
    expect(protectedAfterRevocation.status).toBe(200);
    expect(protectedAfterRevocation.body.data).toBeUndefined();
    expect(protectedAfterRevocation.body.errors[0].extensions.code).toBe('INVALID_TOKEN');
  });

  it('does not allow possession-only redemption from an auth-center browser request', async () => {
    const response = await postGraphQL(
      REAL_RUNTIME_FIXTURE.authHost,
      `mutation Redeem($input: RedeemUnifiedLoginHandoffInput!) {
        redeemUnifiedLoginHandoff(input: $input) { accessToken returnTo }
      }`,
      { input: { handoffCode: 'h'.repeat(43) } }
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('runs the GitHub Provider boundary through real DB state and the shared handoff', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(
      async input => {
        const url = String(input);
        if (url === 'https://github.com/login/oauth/access_token') {
          return new Response(JSON.stringify({ access_token: 'github-token' }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        if (url === 'https://api.github.com/user') {
          return new Response(JSON.stringify({
            id: 424242,
            login: 'unified-provider-user',
            name: 'Unified Provider User',
            email: 'provider-user@example.com'
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        throw new Error(`Unexpected Provider request: ${url}`);
      }
    );

    const startResponse = await startLogin();
    const transactionId = startResponse.body.data.startUnifiedLogin.transactionId;
    const providerStart = await postGraphQL(
      REAL_RUNTIME_FIXTURE.authHost,
      `mutation Provider($input: StartProviderAuthenticationInput!) {
        startProviderAuthentication(input: $input) { authorizationUrl }
      }`,
      { input: { transactionId, providerKey: 'github' } }
    );
    expect(providerStart.body.errors).toBeUndefined();
    const authorizationEntry = providerStart.body.data
      .startProviderAuthentication.authorizationUrl as string;
    expect(authorizationEntry).toMatch(/^\/auth\/oauth\/authorize\?state=/);
    expect(authorizationEntry).not.toContain(transactionId);

    const authorize = await request
      .get(authorizationEntry)
      .set('Host', REAL_RUNTIME_FIXTURE.authHost)
      .set('X-Forwarded-Proto', 'https')
      .set('Cookie', `csrf_token=${browserBinding}`);
    expect(authorize.status).toBe(303);
    const providerAuthorization = new URL(authorize.headers.location);
    expect(providerAuthorization.origin).toBe('https://github.com');
    expect(providerAuthorization.pathname).toBe('/login/oauth/authorize');
    expect(providerAuthorization.searchParams.get('code_challenge_method')).toBe('S256');
    expect(providerAuthorization.searchParams.get('code_challenge')).toMatch(
      /^[A-Za-z0-9_-]{43}$/
    );
    const oauthState = providerAuthorization.searchParams.get('state');
    expect(oauthState).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(providerAuthorization.toString()).not.toContain(transactionId);

    const callback = await request
      .get(`/auth/oauth/callback?state=${encodeURIComponent(oauthState as string)}&code=provider-code`)
      .set('Host', REAL_RUNTIME_FIXTURE.authHost)
      .set('X-Forwarded-Proto', 'https')
      .set('Cookie', `csrf_token=${browserBinding}`);
    expect(callback.status).toBe(303);
    const callbackCookies = (callback.headers['set-cookie'] ?? []) as string[];
    expect(callbackCookies).toEqual(expect.arrayContaining([
      expect.stringContaining('constructive_session=')
    ]));
    const centralProviderToken = decodeURIComponent(
      callbackCookies
        .find(value => value.startsWith('constructive_session='))!
        .split(';')[0]
        .split('=')[1]
    );
    expect(centralProviderToken).toMatch(/^cnc_live_bt_/);

    const continuation = new URL(callback.headers.location);
    const handoffCode = continuation.searchParams.get('handoff');
    expect(continuation.origin).toBe(`https://${REAL_RUNTIME_FIXTURE.siteHost}`);
    expect(handoffCode).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const redeem = await postGraphQL(
      REAL_RUNTIME_FIXTURE.siteHost,
      `mutation Redeem($input: RedeemUnifiedLoginHandoffInput!) {
        redeemUnifiedLoginHandoff(input: $input) { userId accessToken returnTo }
      }`,
      { input: { handoffCode } },
      REAL_RUNTIME_FIXTURE.serviceApiKey
    );
    expect(redeem.body.errors).toBeUndefined();
    expect(redeem.body.data.redeemUnifiedLoginHandoff).toMatchObject({
      returnTo: '/approvals/42',
      accessToken: expect.stringMatching(/^cnc_live_bt_/)
    });
    expect(redeem.body.data.redeemUnifiedLoginHandoff.accessToken)
      .not.toBe(centralProviderToken);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockRestore();
  });
});
