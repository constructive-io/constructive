import {
  classifyBackendErrors,
  type GraphQLError,
  postGraphQL,
  statusAdapter,
} from '../src/graphql-http';

const ENDPOINT = 'http://api-myapp.example.test/graphql';

const respond = (status: number, body?: unknown, statusText = '') =>
  jest.fn(async () =>
    body === undefined
      ? new Response('', { status, statusText })
      : new Response(JSON.stringify(body), { status, statusText, headers: { 'Content-Type': 'application/json' } }),
  ) as unknown as typeof fetch;

const SUSPENDED_BODY = {
  errors: [{ message: 'Access to this database is suspended.', extensions: { code: 'ACCESS_SUSPENDED' } }],
};

describe('postGraphQL', () => {
  it('sends the operation name only when it is set', async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchFn = jest.fn(async (_url: unknown, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;
    const query = 'query First { __typename } query Second { __typename }';

    await postGraphQL({ endpoint: ENDPOINT, query, operationName: 'Second', fetchFn });
    await postGraphQL({ endpoint: ENDPOINT, query: '{ __typename }', fetchFn });

    expect(bodies).toEqual([
      { query, variables: {}, operationName: 'Second' },
      { query: '{ __typename }', variables: {} },
    ]);
  });

  it('keeps the code of a 403 body and adds the status', async () => {
    const result = await postGraphQL({ endpoint: ENDPOINT, query: '{ __typename }', fetchFn: respond(403, SUSPENDED_BODY, 'Forbidden') });

    expect(result.httpStatus).toBe(403);
    expect(result.errors).toEqual([
      {
        message: 'Access to this database is suspended.',
        extensions: { code: 'ACCESS_SUSPENDED', httpStatus: 403 },
      },
    ]);
    expect(classifyBackendErrors(result.errors)).toBe('suspended');
  });

  it('turns a 403 without a body into an HTTP_ERROR that still reads as a refusal', async () => {
    const result = await postGraphQL({ endpoint: ENDPOINT, query: '{ __typename }', fetchFn: respond(403, undefined, 'Forbidden') });

    expect(result).toEqual({
      httpStatus: 403,
      data: null,
      errors: [{ message: 'HTTP 403: Forbidden', extensions: { code: 'HTTP_ERROR', httpStatus: 403 } }],
    });
    expect(classifyBackendErrors(result.errors)).toBe('forbidden');
  });

  it('reports a fetch that threw as NETWORK, with no status', async () => {
    const fetchFn = jest.fn(async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    }) as unknown as typeof fetch;

    const result = await postGraphQL({ endpoint: ENDPOINT, query: '{ __typename }', fetchFn });

    expect(result.httpStatus).toBeNull();
    expect(result.errors).toEqual([{ message: 'fetch failed (ECONNREFUSED)', extensions: { code: 'NETWORK' } }]);
    expect(classifyBackendErrors(result.errors)).toBe('network');
  });

  it('gives the SDK clients the same errors through statusAdapter', async () => {
    const adapter = statusAdapter(ENDPOINT, { Authorization: 'Bearer t' }, respond(403, SUSPENDED_BODY));

    const failed = await adapter.execute('{ __typename }');
    const ok = await statusAdapter(ENDPOINT, {}, respond(200, { data: { __typename: 'Query' } })).execute(
      '{ __typename }',
    );

    expect(failed).toMatchObject({ ok: false, data: null, errors: [{ extensions: { code: 'ACCESS_SUSPENDED' } }] });
    expect(ok).toEqual({ ok: true, data: { __typename: 'Query' }, errors: undefined });
  });
});

describe('classifyBackendErrors', () => {
  const error = (message: string, extensions?: Record<string, unknown>): GraphQLError => ({ message, extensions });

  it.each<[string, GraphQLError[], ReturnType<typeof classifyBackendErrors>]>([
    ['ACCESS_SUSPENDED beats the 403 it came with', [error('x', { code: 'ACCESS_SUSPENDED', httpStatus: 403 })], 'suspended'],
    ['no response', [error('fetch failed', { code: 'NETWORK' })], 'network'],
    ['a 5xx', [error('Bad Gateway', { httpStatus: 502 })], 'server'],
    ['a 429', [error('Too Many Requests', { httpStatus: 429 })], 'rate-limited'],
    ["the SDK adapter's HTTP 503 text", [error('HTTP 503: Service Unavailable')], 'server'],
    [
      'a 429 the server put inside an HTTP 200 answer',
      [error('Too many requests are in flight for this API. Please retry in a moment.', { code: 'CONCURRENCY_LIMIT_REACHED', class: 'public', http: 429 })],
      'rate-limited',
    ],
    ['a 401', [error('Unauthorized', { httpStatus: 401 })], 'auth'],
    ['UNAUTHENTICATED', [error('x', { code: 'UNAUTHENTICATED' })], 'auth'],
    ['FORBIDDEN', [error('x', { code: 'FORBIDDEN' })], 'forbidden'],
    // The text never decides: the server sends a code for what it means to show.
    ['the text of an expired jwt with no code', [error('jwt expired')], 'graphql'],
    ['the text of a permission refusal with no code', [error('permission denied for table database')], 'graphql'],
    [
      'an internal error that keeps a FORBIDDEN code',
      [error('An unexpected error occurred.', { code: 'FORBIDDEN', class: 'internal', errorId: '0123456789abcdef' })],
      'graphql',
    ],
    ['anything else', [error('Cannot query field "hash" on type "Database".')], 'graphql'],
  ])('%s', (_case, errors, kind) => {
    expect(classifyBackendErrors(errors)).toBe(kind);
  });
});

describe('a 429 with Retry-After', () => {
  it('keeps the seconds the backend asks to wait on each error', async () => {
    const fetchFn = jest.fn(async () =>
      new Response(JSON.stringify({ errors: [{ message: 'Too many requests.', extensions: { code: 'RATE_LIMITED', class: 'public' } }] }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '12' },
      }),
    ) as unknown as typeof fetch;

    const result = await postGraphQL({ endpoint: ENDPOINT, query: '{ __typename }', fetchFn });

    expect(result.errors[0].extensions).toMatchObject({ code: 'RATE_LIMITED', httpStatus: 429, retryAfterSeconds: 12 });
  });
});
