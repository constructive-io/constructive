import { createHash } from 'node:crypto';
import path from 'node:path';

import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60_000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const local = (...segments: string[]) => path.join(
  __dirname,
  '..',
  '__fixtures__',
  'seed',
  'oauth-sso',
  ...segments
);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const siteId = 'f1000000-0000-0000-0000-000000000001';
const authHost = 'app.test.constructive.io';
const browserBinding = 'b'.repeat(43);
const siteState = 's'.repeat(43);

const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

describe('OAuth/SSO real server integration seam', () => {
  let request: supertest.Agent;
  let pg: PgTestClient;
  let teardown: () => Promise<void>;

  const postGraphQL = (query: string, variables?: Record<string, unknown>) =>
    request
      .post('/graphql')
      .set('Host', authHost)
      .set('Cookie', `csrf_token=${browserBinding}`)
      .send({ query, variables });

  const startLogin = () => postGraphQL(
    `mutation Start($input: StartUnifiedLoginInput!) {
      startUnifiedLogin(input: $input) {
        transactionId
        site { id displayName themeColor }
        providers { key }
      }
    }`,
    {
      input: {
        siteId,
        returnTo: '/approvals/42',
        siteState
      }
    }
  );

  beforeAll(async () => {
    ({ request, pg, teardown } = await getConnections(
      {
        schemas: ['simple-pets-public', 'simple-pets-pets-public'],
        authRole: 'anonymous',
        server: {
          useRouting: true,
          api: {
            isPublic: true,
            metaSchemas
          }
        }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          shared('app-schemas', 'simple-pets', 'schema.sql'),
          shared('scoped', 'test-data.sql'),
          shared('app-schemas', 'simple-pets', 'test-data.sql'),
          local('contract.sql')
        ])
      ]
    ));
  });

  afterAll(async () => teardown());

  it('starts only through the canonical routed Tenant host', async () => {
    const response = await startLogin();

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.startUnifiedLogin).toMatchObject({
      transactionId: 't'.repeat(43),
      site: {
        id: siteId,
        displayName: 'Customer Portal',
        themeColor: '#112233'
      },
      providers: []
    });

    const [stored] = await pg.any<{
      browser_binding: string;
      return_to: string;
      start_api_id: string;
    }>(
      `SELECT browser_binding, return_to, start_api_id
       FROM tenant_test_sso_private.test_login_transactions`
    );
    expect(stored).toEqual({
      browser_binding: browserBinding,
      return_to: '/approvals/42',
      start_api_id: '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
    });

    const unknownHost = await request
      .post('/graphql')
      .set('Host', 'unknown.example.test')
      .set('Cookie', `csrf_token=${browserBinding}`)
      .send({
        query: `mutation Start($input: StartUnifiedLoginInput!) {
          startUnifiedLogin(input: $input) { transactionId }
        }`,
        variables: { input: { siteId, siteState } }
      });
    expect(unknownHost.status).toBe(404);
  });

  it('converges local sign-in on a hashed handoff and host-only auth cookie', async () => {
    const startResponse = await startLogin();
    expect(startResponse.status).toBe(200);
    expect(startResponse.body.errors).toBeUndefined();

    const response = await postGraphQL(
      `mutation SignIn($input: UnifiedPasswordInput!) {
        signInUnifiedLogin(input: $input) {
          accessToken
          continuationUrl
        }
      }`,
      {
        input: {
          transactionId: 't'.repeat(43),
          email: 'user@example.com',
          password: 'correct horse battery staple'
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    const cookie = cookies
      .find(value => value.startsWith('constructive_session='));
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).not.toContain('Domain=');

    const continuation = new URL(
      response.body.data.signInUnifiedLogin.continuationUrl
    );
    const handoff = continuation.searchParams.get('handoff');
    expect(continuation.origin).toBe('https://site-one.example');
    expect(continuation.pathname).toBe('/auth/complete');
    expect(continuation.searchParams.get('locale')).toBe('en');
    expect(continuation.searchParams.get('site_state')).toBe(siteState);
    expect(handoff).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(continuation.toString()).not.toContain('cnc_live_bt_auth_center_fixture');

    const [stored] = await pg.any<{ code_hash_hex: string }>(
      `SELECT encode(code_hash, 'hex') AS code_hash_hex
       FROM tenant_test_sso_private.test_handoffs`
    );
    expect(stored.code_hash_hex).toBe(
      createHash('sha256').update(handoff as string).digest('hex')
    );
  });

  it('does not allow possession-only redemption from a browser request', async () => {
    const response = await postGraphQL(
      `mutation Redeem($input: RedeemUnifiedLoginHandoffInput!) {
        redeemUnifiedLoginHandoff(input: $input) { accessToken returnTo }
      }`,
      { input: { handoffCode: 'h'.repeat(43) } }
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(response.headers['set-cookie'] ?? []).not.toEqual(
      expect.arrayContaining([expect.stringContaining('constructive_session=')])
    );
  });

  it('keeps OAuth disabled behavior stable without Provider resolution', async () => {
    const response = await postGraphQL(
      `mutation Provider($input: StartProviderAuthenticationInput!) {
        startProviderAuthentication(input: $input) { authorizationUrl }
      }`,
      {
        input: {
          transactionId: 't'.repeat(43),
          providerKey: 'google'
        }
      }
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors[0].extensions.code).toBe('OAUTH_SIGN_IN_DISABLED');
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
