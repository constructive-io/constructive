import http from 'node:http';
import type { AddressInfo } from 'node:net';

/** A GraphQL answer, sent with HTTP 200 unless it gives another `status`. */
export type GraphQLAnswer = { data?: unknown; errors?: unknown[]; status?: number };

/** A request the fake backend saw: the Host header and the GraphQL document. */
export type SeenRequest = { host: string; query: string; variables: Record<string, unknown> };

export type FakeBackend = {
  /** `http://<host>:<port>/graphql`; `*.localhost` hosts reach this server too. */
  endpoint(host?: string): string;
  requests: SeenRequest[];
  close(): Promise<void>;
};

/** A GraphQL backend on localhost that answers each request with `answer`. */
export async function startFakeBackend(answer: (request: SeenRequest) => GraphQLAnswer): Promise<FakeBackend> {
  const requests: SeenRequest[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}') as { query?: string; variables?: Record<string, unknown> };
      const request = { host: req.headers.host ?? '', query: parsed.query ?? '', variables: parsed.variables ?? {} };
      requests.push(request);
      const { status, ...sent } = answer(request);
      res.statusCode = status ?? 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(sent));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    endpoint: (host = 'api.localhost') => `http://${host}:${port}/graphql`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

export const DATABASE_ID = '019a1d47-5c2e-7a1b-8f00-112233445566';

/** The answers every bound project needs: the binding probe and the app_public schema. */
export function projectAnswer(query: string, ownerId: string): GraphQLAnswer | undefined {
  if (/ProbeDatabase/.test(query)) {
    return { data: { databases: { nodes: [{ id: DATABASE_ID, name: 'mydb', ownerId, hash: 'h', suspendedAt: null, suspendedReason: null }] } } };
  }
  if (/schemas/.test(query)) return { data: { schemas: { nodes: [{ id: 'schema-1', name: 'app_public' }] } } };
  return undefined;
}
