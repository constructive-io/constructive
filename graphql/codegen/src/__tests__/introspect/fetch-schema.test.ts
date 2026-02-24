import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { fetchSchema } from '../../core/introspect/fetch-schema';

const startServer = async (
  handler: http.RequestListener,
): Promise<{
  endpoint: string;
  stop: () => Promise<void>;
}> => {
  const server = http.createServer(handler);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const endpoint = `http://127.0.0.1:${address.port}/graphql`;

  return {
    endpoint,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
};

describe('fetchSchema', () => {
  it('reports GraphQL extension codes when message is missing', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          errors: [
            {
              extensions: {
                code: 'UNAUTHENTICATED',
              },
            },
          ],
        }),
      );
    });

    try {
      const result = await fetchSchema({
        endpoint: server.endpoint,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('GraphQL errors: UNAUTHENTICATED');
    } finally {
      await server.stop();
    }
  });

  it('falls back to serialized error objects when message and code are missing', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          errors: [
            {
              reason: 'blocked',
            },
          ],
        }),
      );
    });

    try {
      const result = await fetchSchema({
        endpoint: server.endpoint,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('GraphQL errors:');
      expect(result.error).toContain('"reason":"blocked"');
    } finally {
      await server.stop();
    }
  });

  it('returns diagnostics for non-JSON responses', async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
      });
      res.end('upstream gateway error');
    });

    try {
      const result = await fetchSchema({
        endpoint: server.endpoint,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON response from GraphQL endpoint');
      expect(result.error).toContain('content-type: text/plain');
      expect(result.error).toContain('upstream gateway error');
    } finally {
      await server.stop();
    }
  });
});
