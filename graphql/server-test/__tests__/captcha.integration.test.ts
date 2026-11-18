/**
 * The captcha gate through the real server: with `enable_captcha` on, a
 * sign-up or password-reset mutation runs only for a request carrying a token
 * the verifier accepts. What is gated is the mutation field that executes, so
 * the operation's name, a field alias, a fragment, the other operations in
 * the document and the request's content type do not change the answer.
 *
 * The reCAPTCHA service is replaced at `fetch`, the server's only way to it.
 */

import path from 'path';
import type { PgTestClient } from 'pgsql-test';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeeds = path.join(__dirname, '..', '__fixtures__', 'seed');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const HOST = 'app.test.constructive.io';
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const SECRET = 'test-secret';
const TOKEN = 'X-Captcha-Token';

const SIGN_UP_FIELD = 'signUp(input: { email: "new@example.com", password: "password" }) { result { accessToken } }';
const SIGN_UP = `mutation SignUp { ${SIGN_UP_FIELD} }`;
const SIGN_IN = 'mutation SignIn { signIn(input: { email: "user@example.com", password: "password" }) { result { accessToken } } }';

/** Every gated mutation, with the name its stand-in records when it runs. */
const GATED: Array<[field: string, selection: string, recorded: string]> = [
  ['signUp', SIGN_UP_FIELD, 'sign_up'],
  ['signUpMagicLink', 'signUpMagicLink(input: { email: "new@example.com" }) { result }', 'sign_up_magic_link'],
  ['signUpSms', 'signUpSms(input: { phone: "+15555550100" }) { result }', 'sign_up_sms'],
  ['forgotPassword', 'forgotPassword(input: { email: "user@example.com" }) { result }', 'forgot_password'],
  ['resetPassword', 'resetPassword(input: { resetToken: "t", newPassword: "password" }) { result }', 'reset_password']
];

const codes = (res: supertest.Response): string[] => 
  (res.body?.errors ?? []).map((e: { extensions?: { code?: string } }) => e.extensions?.code);

describe('captcha gate', () => {
  let request: supertest.Agent;
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  let fetchSpy: jest.SpyInstance;
  let verifications: Array<{ secret: string | null; response: string | null }>;
  let verifierDown: boolean;
  const savedSecret = process.env.RECAPTCHA_SECRET_KEY;

  const post = (query: string, headers: Record<string, string> = {}, operationName?: string) => {
    let req = request.post('/graphql').set('Host', HOST);
    for (const [name, value] of Object.entries(headers)) {
      req = req.set(name, value);
    }
    return req.send({ query, operationName });
  };

  const gatedCalls = async (): Promise<string[]> => {
    const { rows } = await pg.query<{ name: string }>(
      'SELECT name FROM "simple-pets-auth-private".gated_calls ORDER BY id'
    );
    return rows.map((row) => row.name);
  };

  const expectRefused = async (res: supertest.Response, code = 'CAPTCHA_REQUIRED') => {
    expect(codes(res)).toEqual([code]);
    expect(res.body.data ?? null).toBeNull();
    expect(await gatedCalls()).toEqual([]);
  };

  beforeAll(async () => {
    ({ request, pg, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: { useRouting: true, api: { isPublic: true, metaSchemas } }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          path.join(sharedSeedRoot, 'app-schemas', 'simple-pets', 'schema.sql'),
          path.join(sharedSeedRoot, 'scoped', 'test-data.sql'),
          path.join(localSeeds, 'auth-cookie', 'schema.sql'),
          path.join(localSeeds, 'captcha', 'schema.sql')
        ])
      ]
    ));

    // The verifier accepts exactly one token, once, as the real service does.
    const spent = new Set<string>();
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url !== VERIFY_URL) throw new Error(`unexpected outbound request to ${url}`);
      if (verifierDown) throw new Error('connect ECONNREFUSED');
      const params = new URLSearchParams(String(init?.body));
      const response = params.get('response');
      verifications.push({ secret: params.get('secret'), response });
      const success = params.get('secret') === SECRET && response?.startsWith('good') && !spent.has(response);
      if (success) spent.add(response);
      return new Response(
        JSON.stringify(success ? { success: true } : { success: false, 'error-codes': ['invalid-input-response'] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    });
  });

  afterAll(async () => {
    fetchSpy?.mockRestore();
    if (savedSecret === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = savedSecret;
    await teardown();
  });

  beforeEach(async () => {
    process.env.RECAPTCHA_SECRET_KEY = SECRET;
    verifications = [];
    verifierDown = false;
    await pg.query('DELETE FROM "simple-pets-auth-private".gated_calls');
  });

  it('serves this host with the tenant auth settings that turn captcha on', async () => {
    const res = await post(SIGN_IN);

    // `SameSite=Strict` is the fixture row's value; the built-in default is Lax.
    const cookies = ([] as string[]).concat((res.headers['set-cookie'] as unknown as string[] | string) ?? []);
    expect(cookies.find((c) => c.startsWith('constructive_session='))).toMatch(/SameSite=Strict/);
  });

  describe.each(GATED)('%s', (_field, selection, recorded) => {
    it('is refused without a token', async () => {
      const res = await post(`mutation { ${selection} }`);

      await expectRefused(res);
      expect(verifications).toEqual([]);
    });

    it('runs with a token the verifier accepts', async () => {
      const token = `good-${recorded}`;
      const res = await post(`mutation { ${selection} }`, { [TOKEN]: token });

      expect(res.body.errors).toBeUndefined();
      expect(await gatedCalls()).toEqual([recorded]);
      expect(verifications).toEqual([{ secret: SECRET, response: token }]);
    });
  });

  describe('signUp without a token is refused', () => {
    it('when the operation is named after the field', async () => {
      await expectRefused(await post(`mutation signUp { ${SIGN_UP_FIELD} }`, {}, 'signUp'));
    });

    it('when the operation has another name', async () => {
      await expectRefused(await post(`mutation Harmless { ${SIGN_UP_FIELD} }`, {}, 'Harmless'));
    });

    it('when no operationName is sent', async () => {
      await expectRefused(await post(SIGN_UP));
    });

    it('when the field is aliased', async () => {
      await expectRefused(await post(`mutation { signIn: ${SIGN_UP_FIELD} }`));
    });

    it('when the field sits in a fragment', async () => {
      await expectRefused(
        await post(`mutation { ...F } fragment F on Mutation { ... on Mutation { ${SIGN_UP_FIELD} } }`)
      );
    });

    it('when it is the selected operation of several', async () => {
      await expectRefused(await post(`${SIGN_IN}\n${SIGN_UP}`, {}, 'SignUp'));
    });

    it('when it follows an ungated mutation in the same operation', async () => {
      const res = await post(
        `mutation { signIn(input: { email: "user@example.com", password: "password" }) { result { accessToken } } ${SIGN_UP_FIELD} }`
      );

      await expectRefused(res);
    });

    it('when the document is sent as application/graphql', async () => {
      const res = await request
        .post('/graphql')
        .set('Host', HOST)
        .set('Content-Type', 'application/graphql')
        .send(SIGN_UP);

      await expectRefused(res);
    });

    it('when the request is a batch array', async () => {
      const res = await request
        .post('/graphql')
        .set('Host', HOST)
        .send([{ query: SIGN_UP }, { query: SIGN_UP }]);

      expect(res.body.data).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('session-token');
      expect(await gatedCalls()).toEqual([]);
    });

    it('when the request is a GET', async () => {
      const res = await request.get('/graphql').set('Host', HOST).query({ query: SIGN_UP });

      expect(res.body.data ?? null).toBeNull();
      expect(await gatedCalls()).toEqual([]);
    });
  });

  it('refuses a token the verifier rejects', async () => {
    const res = await post(SIGN_UP, { [TOKEN]: 'bad-token' });

    await expectRefused(res, 'CAPTCHA_FAILED');
    expect(verifications).toEqual([{ secret: SECRET, response: 'bad-token' }]);
  });

  it('refuses when the verifier cannot be reached', async () => {
    verifierDown = true;

    await expectRefused(await post(SIGN_UP, { [TOKEN]: 'good-unreachable' }), 'CAPTCHA_FAILED');
  });

  it('refuses when the server has no verification secret', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;

    await expectRefused(await post(SIGN_UP, { [TOKEN]: 'good-no-secret' }), 'CAPTCHA_FAILED');
    expect(verifications).toEqual([]);
  });

  it('refuses one token spent on two gated fields', async () => {
    const res = await post(`mutation { a: ${SIGN_UP_FIELD} b: ${SIGN_UP_FIELD} }`, { [TOKEN]: 'good-twice' });

    await expectRefused(res);
  });

  it('refuses a token the verifier has already accepted', async () => {
    const first = await post(SIGN_UP, { [TOKEN]: 'good-replayed' });
    expect(first.body.errors).toBeUndefined();

    const second = await post(SIGN_UP, { [TOKEN]: 'good-replayed' });
    expect(codes(second)).toEqual(['CAPTCHA_FAILED']);
    expect(await gatedCalls()).toEqual(['sign_up']);
  });

  describe('requests that are not gated need no token', () => {
    it('a mutation that is not gated', async () => {
      const res = await post(SIGN_IN);

      expect(res.body.data.signIn.result.accessToken).toBe('session-token');
      expect(verifications).toEqual([]);
    });

    it('a query whose operation is named signUp', async () => {
      const res = await post('query signUp { __typename }', {}, 'signUp');

      expect(res.body).toEqual({ data: { __typename: 'Query' } });
    });

    it('an ungated mutation aliased to a gated name', async () => {
      const res = await post(
        'mutation { signUp: signIn(input: { email: "user@example.com", password: "password" }) { result { accessToken } } }'
      );

      expect(res.body.data.signUp.result.accessToken).toBe('session-token');
    });

    it('the selected operation, when a gated one sits unselected beside it', async () => {
      const res = await post(`${SIGN_IN}\n${SIGN_UP}`, {}, 'SignIn');

      expect(res.body.data.signIn.result.accessToken).toBe('session-token');
      expect(await gatedCalls()).toEqual([]);
    });
  });
});
