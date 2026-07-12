import type { NextFunction, Request, Response } from 'express';

import { createCaptchaMiddleware } from '../captcha';

const originalFetch = global.fetch;
const originalRecaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

const createReq = (overrides: Partial<Request> = {}): Request => ({
  api: {
    authSettings: {
      enableCaptcha: true,
    },
  },
  body: {
    operationName: 'signUp',
  },
  get: jest.fn((name: string) => (name.toLowerCase() === 'x-captcha-token' ? 'token-123' : undefined)),
  ...overrides,
} as unknown as Request);

const createRes = (): Response => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
} as unknown as Response);

describe('createCaptchaMiddleware', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalRecaptchaSecretKey === undefined) {
      delete process.env.RECAPTCHA_SECRET_KEY;
    } else {
      process.env.RECAPTCHA_SECRET_KEY = originalRecaptchaSecretKey;
    }
    jest.restoreAllMocks();
  });

  it('does not read RECAPTCHA_SECRET_KEY directly from process.env', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'env-secret';
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const next = jest.fn() as NextFunction;
    await createCaptchaMiddleware()(createReq(), createRes(), next);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('uses the configured reCAPTCHA secret key when verifying a token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const next = jest.fn() as NextFunction;
    await createCaptchaMiddleware({ recaptchaSecretKey: 'configured-secret' })(
      createReq(),
      createRes(),
      next,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get('secret')).toBe('configured-secret');
    expect(body.get('response')).toBe('token-123');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
