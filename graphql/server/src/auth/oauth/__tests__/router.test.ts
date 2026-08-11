import { errors } from '@constructive-io/errors';
import type { ConstructiveContext } from '@constructive-io/express-context';
import express from 'express';
import supertest from 'supertest';

import { createOAuthRouter } from '../router';
import {
  completeProviderAuthentication,
  createProviderAuthorizationUrl
} from '../service';

jest.mock('../service', () => ({
  completeProviderAuthentication: jest.fn(),
  createProviderAuthorizationUrl: jest.fn()
}));

const mockedAuthorize = jest.mocked(createProviderAuthorizationUrl);
const mockedComplete = jest.mocked(completeProviderAuthentication);
const opaqueState = 's'.repeat(43);

const makeApp = () => {
  const app = express();
  const context = {
    useModule: jest.fn(async () => ({ privateSchema: 'tenant_sso_private' }))
  } as unknown as ConstructiveContext;
  app.use((req, _res, next) => {
    req.constructive = context;
    req.cookies = { csrf_token: 'b'.repeat(64) };
    req.deviceToken = 'device-token';
    req.api = {
      dbname: 'tenant',
      anonRole: 'anonymous',
      roleName: 'anonymous',
      schema: [],
      authSettings: {
        cookieDomain: '.example.com',
        cookieSecure: false,
        cookieHttponly: false
      }
    };
    next();
  });
  app.use('/auth/oauth', createOAuthRouter({ requestTimeoutMs: 1000 }));
  return app;
};

describe('OAuth HTTP routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects authorize using only the server-restored adapter URL', async () => {
    mockedAuthorize.mockResolvedValue(
      'https://github.com/login/oauth/authorize?state=provider-state'
    );

    const response = await supertest(makeApp())
      .get(`/auth/oauth/authorize?state=${opaqueState}`)
      .expect(303);

    expect(response.headers.location).toBe(
      'https://github.com/login/oauth/authorize?state=provider-state'
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  it('sets a Secure HttpOnly host-only auth-center cookie after callback', async () => {
    mockedComplete.mockResolvedValue({
      credentialId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
      accessToken: 'cnc_auth_center_token',
      accessTokenExpiresAt: '2026-08-10T12:00:00.000Z',
      isVerified: true,
      totpEnabled: false,
      continuationUrl:
        'https://portal.example.com/auth/complete?handoff=handoff-code&site_state=site-state'
    });

    const response = await supertest(makeApp())
      .get(`/auth/oauth/callback?state=${opaqueState}&code=provider-code`)
      .expect(303);

    const cookie = response.headers['set-cookie'][0] as string;
    expect(cookie).toContain('constructive_session=cnc_auth_center_token');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).not.toContain('Domain=');
    expect(response.headers.location).toBe(
      'https://portal.example.com/auth/complete?handoff=handoff-code&site_state=site-state'
    );
    expect(response.text).not.toContain('cnc_auth_center_token');
    expect(mockedComplete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ deviceToken: 'device-token' })
    );
  });

  it('returns only a stable safe cancellation classification', async () => {
    mockedComplete.mockRejectedValue(errors.OAUTH_AUTHORIZATION_CANCELLED());

    const response = await supertest(makeApp())
      .get(
        `/auth/oauth/callback?state=${opaqueState}` +
        '&error=access_denied&error_description=provider-secret-detail'
      )
      .expect(400);

    expect(response.text).toContain('OAUTH_AUTHORIZATION_CANCELLED');
    expect(response.text).not.toContain('provider-secret-detail');
    expect(mockedComplete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ providerReturnedError: true })
    );
  });
});
