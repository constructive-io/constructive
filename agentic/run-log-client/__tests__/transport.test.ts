import { createGraphqlRequest } from '../src/transport';

const response = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

describe('createGraphqlRequest', () => {
  it('sends the operation with the headers the host supplies', async () => {
    const calls: RequestInit[] = [];
    const request = createGraphqlRequest({
      endpoint: 'https://api.example/graphql',
      headers: () => ({ Authorization: 'Bearer token-1' }),
      fetch: (async (_url: string, init: RequestInit) => {
        calls.push(init);
        return response({ data: { ok: true } });
      }) as unknown as typeof fetch,
    });

    await expect(request('query { ok }')).resolves.toEqual({ ok: true });
    expect(
      (calls[0].headers as Record<string, string>).Authorization
    ).toBe('Bearer token-1');
  });

  it('throws on a GraphQL error rather than returning an empty page', async () => {
    const request = createGraphqlRequest({
      endpoint: 'https://api.example/graphql',
      fetch: (async () =>
        response({
          errors: [{ message: 'permission denied for table agent_event' }],
        })) as unknown as typeof fetch,
    });
    await expect(request('query { ok }')).rejects.toThrow(/permission denied/);
  });

  it('throws on a transport failure', async () => {
    const request = createGraphqlRequest({
      endpoint: 'https://api.example/graphql',
      fetch: (async () =>
        response({ message: 'nope' }, false, 503)) as unknown as typeof fetch,
    });
    await expect(request('query { ok }')).rejects.toThrow(/503/);
  });

  it('throws when a response carries neither data nor errors', async () => {
    const request = createGraphqlRequest({
      endpoint: 'https://api.example/graphql',
      fetch: (async () => response({})) as unknown as typeof fetch,
    });
    await expect(request('query { ok }')).rejects.toThrow(/no data/);
  });
});
