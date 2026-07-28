import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ConfigStore,
  createContext,
  setContextCredentials,
} from '../src/config';
import {
  analyzeGraphQLDocument,
  assertMutationAllowed,
  execute,
  executeGraphQL,
  getExecutionContext,
} from '../src/sdk';

const NOW = new Date('2026-07-20T00:00:00.000Z');

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('GraphQL client', () => {
  it('preserves partial data with typed GraphQL errors', async () => {
    const fetchImplementation = jest.fn(async () =>
      response({
        data: { viewer: { id: '1' } },
        errors: [{ message: 'name unavailable', path: ['viewer', 'name'] }],
      })
    ) as unknown as typeof fetch;

    const result = await executeGraphQL<{ viewer: { id: string } }>(
      'https://api.example.com/graphql',
      'query Viewer { viewer { id } }',
      undefined,
      undefined,
      { fetch: fetchImplementation }
    );

    expect(result).toMatchObject({
      ok: false,
      data: { viewer: { id: '1' } },
      errors: [{ message: 'name unavailable' }],
      error: { code: 'GRAPHQL_RESPONSE_ERROR', category: 'graphql' },
    });
  });

  it('classifies non-JSON and HTTP responses without returning their bodies', async () => {
    const nonJson = jest.fn(async () =>
      response('<html>upstream secret</html>', {
        headers: { 'content-type': 'text/html' },
      })
    ) as unknown as typeof fetch;
    const invalid = await executeGraphQL(
      'https://api.example.com/graphql',
      'query { viewer { id } }',
      undefined,
      undefined,
      { fetch: nonJson }
    );
    expect(invalid.error).toMatchObject({ code: 'GRAPHQL_RESPONSE_INVALID' });
    expect(JSON.stringify(invalid)).not.toContain('upstream secret');

    const unavailable = jest.fn(async () =>
      response('unavailable', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      })
    ) as unknown as typeof fetch;
    const failed = await executeGraphQL(
      'https://api.example.com/graphql',
      'query { viewer { id } }',
      undefined,
      undefined,
      { fetch: unavailable }
    );
    expect(failed.error).toMatchObject({
      code: 'GRAPHQL_HTTP_ERROR',
      status: 503,
      retryable: true,
    });
  });

  it('distinguishes timeout from caller cancellation', async () => {
    const hangingFetch = jest.fn(
      async (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new Error('aborted'));
            return;
          }
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted'))
          );
        })
    ) as unknown as typeof fetch;

    const timedOut = await executeGraphQL(
      'https://api.example.com/graphql',
      'query { viewer { id } }',
      undefined,
      undefined,
      { fetch: hangingFetch, timeoutMs: 5 }
    );
    expect(timedOut.error?.code).toBe('GRAPHQL_TIMEOUT');

    const controller = new AbortController();
    controller.abort();
    const cancelled = await executeGraphQL(
      'https://api.example.com/graphql',
      'query { viewer { id } }',
      undefined,
      undefined,
      { fetch: hangingFetch, signal: controller.signal }
    );
    expect(cancelled.error?.code).toBe('GRAPHQL_CANCELLED');
  });
});

describe('GraphQL operation analysis and execution', () => {
  it('requires disambiguation, selects named operations, and rejects subscriptions', () => {
    const document = `
      query One { viewer { id } }
      mutation Two { updateViewer(input: {}) { viewer { id } } }
    `;
    expect(() => analyzeGraphQLDocument(document)).toThrow(
      expect.objectContaining({ code: 'GRAPHQL_OPERATION_NAME_REQUIRED' })
    );
    expect(analyzeGraphQLDocument(document, 'Two')).toEqual({
      type: 'mutation',
      name: 'Two',
      operationCount: 2,
    });
    expect(() =>
      analyzeGraphQLDocument('subscription Events { event { id } }')
    ).toThrow(
      expect.objectContaining({ code: 'GRAPHQL_SUBSCRIPTION_UNSUPPORTED' })
    );
  });

  it('requires both mutation capabilities in agent mode', () => {
    const mutation = analyzeGraphQLDocument('mutation Change { change }');
    expect(() =>
      assertMutationAllowed(mutation, { agent: true, yes: true })
    ).toThrow(
      expect.objectContaining({ code: 'GRAPHQL_MUTATION_REQUIRES_APPROVAL' })
    );
    expect(() =>
      assertMutationAllowed(mutation, {
        agent: true,
        yes: true,
        allowMutation: true,
      })
    ).not.toThrow();
  });

  it('resolves explicit agent contexts and supports anonymous execution', async () => {
    const root = fs.mkdtempSync(
      path.join(fs.realpathSync(os.tmpdir()), 'cnc-sdk-test-')
    );
    const store = new ConfigStore({ configDir: root });
    createContext('api', 'https://api.example.com/graphql', store, NOW);
    setContextCredentials('api', 'stored-secret', undefined, store);

    await expect(
      getExecutionContext({ agent: true, store })
    ).rejects.toMatchObject({
      code: 'CONTEXT_REQUIRED',
    });
    await expect(
      getExecutionContext({
        agent: true,
        env: { CNC_CONTEXT: 'api' },
        anonymous: true,
        store,
      })
    ).resolves.toMatchObject({ context: { name: 'api' }, anonymous: true });

    const fetchMock = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        response({ data: { ok: true } })
    );
    const fetchImplementation = fetchMock as unknown as typeof fetch;
    const result = await execute('query Check { ok }', undefined, undefined, {
      agent: true,
      contextName: 'api',
      anonymous: true,
      headers: { authorization: 'Bearer must-not-be-sent', 'x-test': 'safe' },
      store,
      fetch: fetchImplementation,
    });
    expect(result).toMatchObject({ ok: true, data: { ok: true } });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).not.toHaveProperty('Authorization');
    expect(request.headers).not.toHaveProperty('authorization');
    expect(request.headers).toHaveProperty('x-test', 'safe');
    expect(JSON.parse(request.body as string)).toMatchObject({
      operationName: 'Check',
    });
    fs.rmSync(root, { recursive: true, force: true });
  });
});
