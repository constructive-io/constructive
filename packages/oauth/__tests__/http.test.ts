import {
  ProviderAdapterError,
  requestProviderJson,
  validateProviderEndpoint
} from '../src';

const endpoint = validateProviderEndpoint('https://api.example.com/token', [
  'https://api.example.com/token'
]);

describe('bounded Provider requests', () => {
  it('uses no-redirect fetch and parses a bounded JSON response', async () => {
    const fetchMock = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' }
        })
    ) as unknown as jest.MockedFunction<typeof fetch>;

    await expect(
      requestProviderJson(endpoint, { method: 'POST' }, {
        timeoutMs: 1000,
        fetch: fetchMock
      })
    ).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      redirect: 'error'
    });
  });

  it('does not expose an unsuccessful Provider response body', async () => {
    const secretBody = 'provider-secret-response';
    const fetchMock = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(secretBody, {
          status: 400,
          headers: { 'content-type': 'application/json' }
        })
    ) as unknown as jest.MockedFunction<typeof fetch>;

    const error = (await requestProviderJson(endpoint, {}, {
      timeoutMs: 1000,
      fetch: fetchMock
    }).catch(value => value)) as ProviderAdapterError;
    expect(error).toBeInstanceOf(ProviderAdapterError);
    expect(error.reason).toBe('INVALID_RESPONSE');
    expect(error.message).not.toContain(secretBody);
  });

  it('rejects oversized and non-JSON responses', async () => {
    const oversized = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response('{}', {
          headers: {
            'content-length': '70000',
            'content-type': 'application/json'
          }
        })
    ) as unknown as jest.MockedFunction<typeof fetch>;
    await expect(
      requestProviderJson(endpoint, {}, { timeoutMs: 1000, fetch: oversized })
    ).rejects.toMatchObject({ reason: 'INVALID_RESPONSE' });

    const wrongType = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response('{}', { headers: { 'content-type': 'text/plain' } })
    ) as unknown as jest.MockedFunction<typeof fetch>;
    await expect(
      requestProviderJson(endpoint, {}, { timeoutMs: 1000, fetch: wrongType })
    ).rejects.toMatchObject({ reason: 'INVALID_RESPONSE' });
  });

  it('classifies timeout without swallowing its cause', async () => {
    const fetchMock = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    ) as unknown as jest.MockedFunction<typeof fetch>;

    const error = (await requestProviderJson(endpoint, {}, {
      timeoutMs: 1,
      fetch: fetchMock
    }).catch(value => value)) as ProviderAdapterError;
    expect(error).toMatchObject({ reason: 'REQUEST_TIMEOUT' });
    expect(error.cause).toBeInstanceOf(DOMException);
  });
});
