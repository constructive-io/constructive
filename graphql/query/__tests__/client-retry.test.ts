import { ConstructiveError, isRetryable, retryAfterMs } from '../src/client/error';
import { execute } from '../src/client/execute';

const ENDPOINT = 'http://api.test/graphql';
const IN_FLIGHT_MESSAGE = 'Too many requests are in flight for this API. Please retry in a moment.';

/** The next `fetch` answers with this status, GraphQL body and headers. */
const respondWith = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers }
    })
  );

/** Admission control's refusal, as the server sends it. */
const concurrencyRefusal = {
  errors: [
    {
      message: IN_FLIGHT_MESSAGE,
      extensions: { code: 'CONCURRENCY_LIMIT_REACHED', class: 'public', http: 429, context: { limit: 50 } }
    }
  ]
};

const failure = (): Promise<unknown> =>
  execute(ENDPOINT, '{ __typename }').then(
    () => {
      throw new Error('expected the request to fail');
    },
    (error: unknown) => error
  );

afterEach(() => jest.restoreAllMocks());

describe('client retry classification', () => {
  it('treats an admission-control refusal as retryable and keeps its Retry-After', async () => {
    respondWith(429, concurrencyRefusal, { 'Retry-After': '5' });
    const error = await failure();

    expect(error).toBeInstanceOf(ConstructiveError);
    expect((error as ConstructiveError).code).toBe('CONCURRENCY_LIMIT_REACHED');
    expect((error as ConstructiveError).message).toBe(IN_FLIGHT_MESSAGE);
    expect(isRetryable(error)).toBe(true);
    expect(retryAfterMs(error)).toBe(5000);
    // The server's own context is kept next to the hint.
    expect((error as ConstructiveError).context).toEqual({ limit: 50, retryAfterSeconds: 5 });
  });

  it('reads a Retry-After given as an HTTP date', async () => {
    respondWith(429, concurrencyRefusal, {
      'Retry-After': new Date(Date.now() + 120_000).toUTCString()
    });
    const waitMs = retryAfterMs(await failure());

    // An HTTP date has whole seconds, so allow a second either way.
    expect(waitMs).toBeGreaterThanOrEqual(119_000);
    expect(waitMs).toBeLessThanOrEqual(121_000);
  });

  it.each([
    ['no Retry-After', {}],
    ['an unreadable Retry-After', { 'Retry-After': 'soon' }]
  ])('leaves the wait undefined for a response with %s', async (_label, headers) => {
    respondWith(429, concurrencyRefusal, headers);
    const error = await failure();

    expect(isRetryable(error)).toBe(true);
    expect(retryAfterMs(error)).toBeUndefined();
  });

  it('does not treat a rejected operation as retryable', async () => {
    respondWith(200, {
      errors: [{ message: 'Cannot query field "nope" on type "Query".', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }]
    });
    const error = await failure();

    expect(isRetryable(error)).toBe(false);
    expect(retryAfterMs(error)).toBeUndefined();
  });

  it('has no wait for values that are not client errors', () => {
    expect(retryAfterMs(new Error('boom'))).toBeUndefined();
    expect(retryAfterMs(undefined)).toBeUndefined();
  });
});
