import type {
  ConstructiveContext,
  SsoSurface
} from '@constructive-io/express-context';
import type { NextFunction, Request, Response } from 'express';
import type { PoolClient, QueryResult } from 'pg';

import { createSiteSessionValidationMiddleware } from '../site-session';

const surface: SsoSurface = { privateSchema: 'tenant_acme_sso_private' };

const makeBoundary = (
  options: {
    siteId?: string | null;
    tokenKind?: string;
    result?: unknown;
    error?: Error;
    ssoEnabled?: boolean;
  } = {}
) => {
  const query = jest.fn(async () => {
    if (options.error) throw options.error;
    return {
      rows: [{ result: options.result ?? { valid: true } }]
    } as unknown as QueryResult;
  });
  const client = { query } as unknown as PoolClient;
  const context = {
    siteId: options.siteId === undefined ? 'site-1' : options.siteId,
    token: {
      id: 'credential-1',
      user_id: 'user-1',
      session_id: 'session-1',
      kind: options.tokenKind ?? 'bearer'
    },
    useModule: jest.fn(async (name: string) =>
      name === 'ssoSurface' && options.ssoEnabled !== false
        ? surface
        : undefined
    ),
    withPgClient: jest.fn(async (callback: (pg: PoolClient) => Promise<unknown>) =>
      callback(client)
    )
  } as unknown as ConstructiveContext;
  const req = {
    constructive: context,
    path: '/graphql',
    originalUrl: '/graphql'
  } as Request;
  const responseBody: { value?: unknown } = {};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn((value: unknown) => {
      responseBody.value = value;
      return res;
    })
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { query, req, res, next, responseBody };
};

describe('Site session validation middleware', () => {
  it('validates a Site-local session through the current Tenant SSO surface', async () => {
    const { query, req, res, next } = makeBoundary();

    await createSiteSessionValidationMiddleware()(req, res, next);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_acme_sso_private"."validate_site_session"'),
      []
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('does not treat a Site runtime API key as a Site-local browser session', async () => {
    const { query, req, res, next } = makeBoundary({ tokenKind: 'api_key' });

    await createSiteSessionValidationMiddleware()(req, res, next);

    expect(query).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('does not infer a Site when routing did not provide one', async () => {
    const { query, req, res, next } = makeBoundary({ siteId: null });

    await createSiteSessionValidationMiddleware()(req, res, next);

    expect(query).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('returns the stable DB authentication error after unified-session revocation', async () => {
    const databaseError = Object.assign(new Error('INVALID_TOKEN'), {
      code: 'P0001',
      detail: JSON.stringify({ code: 'INVALID_TOKEN', context: {}, class: 'public' })
    });
    const { req, res, next, responseBody } = makeBoundary({ error: databaseError });

    await createSiteSessionValidationMiddleware()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(responseBody.value).toMatchObject({
      errors: [{ extensions: { code: 'INVALID_TOKEN' } }]
    });
  });
});
