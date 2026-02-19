import * as http from 'node:http';
import { getIntrospectionQuery, buildSchema, introspectionFromSchema } from 'graphql';

import { fetchEndpointSchemaSDL } from '../src/fetch-endpoint-schema';

const TEST_SDL = `
  type Query {
    hello: String
    version: Int
  }
`;

function createMockServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

function introspectionHandler(_req: http.IncomingMessage, res: http.ServerResponse) {
  const schema = buildSchema(TEST_SDL);
  const introspection = introspectionFromSchema(schema);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data: introspection }));
}

describe('fetchEndpointSchemaSDL', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    ({ server, port } = await createMockServer(introspectionHandler));
  });

  afterAll(() => {
    server.close();
  });

  it('fetches and returns SDL from a live endpoint', async () => {
    const sdl = await fetchEndpointSchemaSDL(`http://127.0.0.1:${port}/graphql`);

    expect(sdl).toContain('type Query');
    expect(sdl).toContain('hello');
    expect(sdl).toContain('version');
  });

  it('throws on HTTP error responses', async () => {
    const { server: errServer, port: errPort } = await createMockServer((_req, res) => {
      res.writeHead(500);
      res.end('Internal Server Error');
    });

    await expect(
      fetchEndpointSchemaSDL(`http://127.0.0.1:${errPort}/graphql`),
    ).rejects.toThrow('HTTP 500');

    errServer.close();
  });

  it('throws on invalid JSON response', async () => {
    const { server: badServer, port: badPort } = await createMockServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html>not json</html>');
    });

    await expect(
      fetchEndpointSchemaSDL(`http://127.0.0.1:${badPort}/graphql`),
    ).rejects.toThrow('Failed to parse response');

    badServer.close();
  });

  it('throws when introspection returns errors', async () => {
    const { server: errServer, port: errPort } = await createMockServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: 'Not allowed' }] }));
    });

    await expect(
      fetchEndpointSchemaSDL(`http://127.0.0.1:${errPort}/graphql`),
    ).rejects.toThrow('Introspection returned errors');

    errServer.close();
  });

  it('passes custom headers to the endpoint', async () => {
    let receivedHeaders: http.IncomingHttpHeaders = {};

    const { server: headerServer, port: headerPort } = await createMockServer((req, res) => {
      receivedHeaders = req.headers;
      introspectionHandler(req, res);
    });

    await fetchEndpointSchemaSDL(`http://127.0.0.1:${headerPort}/graphql`, {
      auth: 'Bearer test-token',
      headerHost: 'custom.host.io',
      headers: { 'X-Custom': 'value123' },
    });

    expect(receivedHeaders['authorization']).toBe('Bearer test-token');
    expect(receivedHeaders['host']).toBe('custom.host.io');
    expect(receivedHeaders['x-custom']).toBe('value123');

    headerServer.close();
  });
});
