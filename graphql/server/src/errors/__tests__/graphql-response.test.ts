import { errors } from '@constructive-io/errors';
import type { Response } from 'express';

import { respondWithGraphQLError } from '../graphql-response';

const createMockResponse = () => {
  const json = jest.fn();
  const res = { status: jest.fn(() => ({ json })) } as unknown as Response;
  return { res, json };
};

describe('respondWithGraphQLError', () => {
  it('always emits a top-level message so clients never render an empty error', () => {
    const { res, json } = createMockResponse();

    respondWithGraphQLError(res, errors.UNAUTHENTICATED());

    const [payload] = json.mock.calls[0];
    expect(payload.errors).toHaveLength(1);
    expect(payload.errors[0].message).toBe('You must be signed in to do that.');
    expect(payload.errors[0].extensions).toMatchObject({
      code: 'UNAUTHENTICATED',
      class: 'public',
      http: 401,
    });
  });

  it('responds 200 per the GraphQL-over-HTTP convention', () => {
    const { res } = createMockResponse();

    respondWithGraphQLError(res, errors.CAPTCHA_REQUIRED());

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('carries interpolated context in the message for dynamic codes', () => {
    const { res, json } = createMockResponse();

    respondWithGraphQLError(res, errors.INTERNAL_FAILURE({ details: 'boom' }));

    const [payload] = json.mock.calls[0];
    expect(payload.errors[0].message).toContain('boom');
    expect(payload.errors[0].extensions.class).toBe('internal');
  });
});
