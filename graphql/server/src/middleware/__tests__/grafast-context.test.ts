import type { ConstructiveContext } from '@constructive-io/express-context';
import type { Request } from 'express';

import { createGrafastRequestContext } from '../grafast-context';

describe('createGrafastRequestContext', () => {
  it('forwards the exact request Constructive Context object', () => {
    const constructive = { requestId: 'request-1' } as ConstructiveContext;
    const request = {
      constructive,
      cookies: { csrf_token: 'browser-binding' }
    } as unknown as Request;
    const pgSettings = { role: 'anonymous' };

    const context = createGrafastRequestContext(request, pgSettings);

    expect(context.constructive).toBe(constructive);
    expect(context.pgSettings).toBe(pgSettings);
    expect(context.browserBinding).toBe('browser-binding');
  });

  it('does not invent a context when Express did not build one', () => {
    expect(createGrafastRequestContext(undefined, {})).toEqual({ pgSettings: {} });
  });

  it('does not accept a non-string browser binding', () => {
    const request = {
      cookies: { csrf_token: ['not', 'a', 'token'] }
    } as unknown as Request;
    expect(createGrafastRequestContext(request, {})).toEqual({ pgSettings: {} });
  });
});
