import express, { type NextFunction, type Request, type Response } from 'express';
import supertest from 'supertest';

import type { ApiStructure } from '../../types';
import {
  createCaptchaGraphqlBodyParsers,
  createCaptchaMiddleware,
  inspectCaptchaOperation
} from '../captcha';

const api = (enableCaptcha: boolean): ApiStructure => ({
  dbname: 'tenant_db',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['app_public'],
  databaseId: 'database-a',
  apiId: 'api-a',
  authSettings: {
    cookieSecure: true,
    cookieSamesite: 'lax',
    cookieDomain: null,
    cookieHttponly: true,
    cookieMaxAge: null,
    cookiePath: '/',
    rememberMeDuration: null,
    enableCaptcha,
    captchaSiteKey: null
  }
});

interface RequestOptions {
  operationName?: unknown;
  enableCaptcha?: boolean;
  headers?: Record<string, string>;
  method?: string;
  path?: string;
  body?: unknown;
}

const request = (
  query: string,
  options: RequestOptions = {}
): Request => {
  const normalized = Object.fromEntries(
    Object.entries(options.headers ?? {})
      .map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    api: api(options.enableCaptcha ?? true),
    body: options.body ?? { query, operationName: options.operationName },
    method: options.method ?? 'POST',
    path: options.path ?? '/graphql',
    query: {},
    get: jest.fn((name: string) => normalized[name.toLowerCase()])
  } as unknown as Request;
};

const response = (): Response => {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
};

describe('CAPTCHA GraphQL operation inspection', () => {
  it.each([
    ['an arbitrary operation label', 'mutation Harmless { signUp }'],
    ['a root field alias', 'mutation Harmless { allowed: resetPassword }'],
    [
      'a fragment spread',
      'mutation Harmless { ...Protected } fragment Protected on Mutation { signUpWithSms }'
    ],
    [
      'an inline fragment',
      'mutation Harmless { ... on Mutation { requestPasswordReset } }'
    ]
  ])('finds a protected root mutation through %s', (_label, query) => {
    expect(inspectCaptchaOperation(query, 'Harmless')).toEqual({
      kind: 'protected',
      fields: expect.any(Array)
    });
  });

  it('uses operationName only to select one operation from a multi-operation document', () => {
    const query = `
      query Safe { viewer { id } }
      mutation Protected { signUp }
    `;

    expect(inspectCaptchaOperation(query, 'Safe')).toEqual({
      kind: 'not-protected'
    });
    expect(inspectCaptchaOperation(query, 'Protected')).toEqual({
      kind: 'protected',
      fields: ['signUp']
    });
    expect(inspectCaptchaOperation(query, undefined)).toEqual({
      kind: 'invalid',
      reason: 'ambiguous or missing GraphQL operation'
    });
  });

  it.each([
    ['malformed syntax', 'mutation {', undefined],
    [
      'a missing fragment',
      'mutation Protected { ...Missing }',
      'Protected'
    ],
    [
      'a cyclic fragment',
      `mutation Protected { ...A }
       fragment A on Mutation { ...B }
       fragment B on Mutation { ...A }`,
      'Protected'
    ],
    ['a missing selected operation', 'query Safe { viewer { id } }', 'Other']
  ])('fails closed for %s', (_label, query, operationName) => {
    expect(inspectCaptchaOperation(query, operationName)).toEqual(
      expect.objectContaining({ kind: 'invalid' })
    );
  });
});

describe('captcha middleware admission', () => {
  const originalSecret = process.env.RECAPTCHA_SECRET_KEY;

  beforeEach(() => {
    delete process.env.RECAPTCHA_SECRET_KEY;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.RECAPTCHA_SECRET_KEY;
    } else {
      process.env.RECAPTCHA_SECRET_KEY = originalSecret;
    }
  });

  it('fails closed in production when tenant policy enables CAPTCHA', async () => {
    const req = request('mutation AnyName { signUp }');
    const res = response();
    const next = jest.fn() as NextFunction;

    await createCaptchaMiddleware({ nodeEnv: 'production' })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      errors: [{
        message: 'Something went wrong: authentication failed',
        extensions: expect.objectContaining({
          code: 'INTERNAL_FAILURE',
          http: 500
        })
      }]
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed under strict authentication outside production', async () => {
    const res = response();
    const next = jest.fn() as NextFunction;

    await createCaptchaMiddleware({
      strictAuth: true,
      nodeEnv: 'development'
    })(request('mutation Reset { requestPasswordReset }'), res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: [expect.objectContaining({
        extensions: expect.objectContaining({ code: 'INTERNAL_FAILURE' })
      })]
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('preserves the local non-strict compatibility behavior', async () => {
    const res = response();
    const next = jest.fn() as NextFunction;

    await createCaptchaMiddleware({
      strictAuth: false,
      nodeEnv: 'development'
    })(request('mutation Register { signUp }'), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([
    [
      'disabled tenant policy',
      request('mutation Register { signUp }', { enableCaptcha: false })
    ],
    ['an unprotected mutation', request('mutation Login { signIn }')],
    ['a query', request('query Viewer { viewer { id } }')],
    [
      'a non-GraphQL route',
      request('mutation Register { signUp }', { path: '/fn/register' })
    ],
    [
      'a WebSocket handshake',
      request('', {
        method: 'GET',
        headers: { upgrade: 'websocket' }
      })
    ]
  ])('does not require a secret for %s', async (_label, req) => {
    const res = response();
    const next = jest.fn() as NextFunction;

    await createCaptchaMiddleware({
      strictAuth: true,
      nodeEnv: 'production'
    })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([
    ['a malformed document', request('mutation {')],
    [
      'an ambiguous document',
      request('query A { viewer { id } } query B { viewer { id } }')
    ],
    ['a missing body', request('', { body: null })],
    ['a batched body', request('', { body: [] })]
  ])('fails closed before GraphQL for %s', async (_label, req) => {
    const res = response();
    const next = jest.fn() as NextFunction;

    await createCaptchaMiddleware({
      strictAuth: false,
      nodeEnv: 'development'
    })(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: [expect.objectContaining({
        extensions: expect.objectContaining({ code: 'INTERNAL_FAILURE' })
      })]
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('still requires a CAPTCHA token when the secret is configured', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'server-side-secret';
    const res = response();
    const next = jest.fn() as NextFunction;

    await createCaptchaMiddleware({ nodeEnv: 'production' })(
      request('mutation Reset { resetPassword }'),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: [expect.objectContaining({
        extensions: expect.objectContaining({ code: 'CAPTCHA_REQUIRED' })
      })]
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['application/json', { query: 'mutation Register { signUp }' }],
    ['application/graphql', 'mutation Register { signUp }'],
    [
      'application/x-www-form-urlencoded',
      'query=mutation%20Register%20%7B%20signUp%20%7D'
    ]
  ])('parses and gates a real %s request before Grafserv', async (contentType, body) => {
    const app = express();
    app.use((req, _res, next) => {
      req.api = api(true);
      next();
    });
    app.use('/graphql', ...createCaptchaGraphqlBodyParsers());
    app.use(createCaptchaMiddleware({ nodeEnv: 'production' }));
    app.use((_req, res) => res.status(204).end());

    const result = await supertest(app)
      .post('/graphql')
      .set('content-type', contentType)
      .send(body);

    expect(result.status).toBe(200);
    expect(result.body.errors[0].extensions.code).toBe('INTERNAL_FAILURE');
  });
});
