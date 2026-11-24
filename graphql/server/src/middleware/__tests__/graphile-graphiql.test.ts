const mockCacheGet = jest.fn();
const mockCacheGraphileInstance = jest.fn();
const mockCreateGraphileInstance = jest.fn();
const mockMakeIntrospectionWiring = jest.fn();
const mockCreateGrafastCacheLimitsPreset = jest.fn();

jest.mock('graphile-cache', () => ({
  cacheGraphileInstance: mockCacheGraphileInstance,
  createGraphileInstance: mockCreateGraphileInstance,
  disposeUncachedEntry: jest.requireActual('graphile-cache').disposeUncachedEntry,
  graphileCache: {
    get: mockCacheGet,
    delete: jest.fn(),
    clear: jest.fn()
  }
}));

jest.mock('@pgpmjs/server-utils', () => ({
  svcCache: { delete: jest.fn(), clear: jest.fn() }
}));

jest.mock('graphile-settings', () => ({
  createConstructivePreset: jest.fn(() => ({})),
  createGrafastCacheLimitsPreset: mockCreateGrafastCacheLimitsPreset
}));

jest.mock('../graphile-introspection', () => ({
  makeIntrospectionWiring: mockMakeIntrospectionWiring
}));

import type { AddressInfo } from 'node:net';
import http from 'node:http';

import express, { type Request, type Response } from 'express';
import { grafserv } from 'grafserv/express/v4';
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';

import { notFoundHandler } from '../error-handler';
import { clearGenerations } from '../cache-generation';
import { clearInFlightMap, graphile, isGraphiqlEnabled } from '../graphile';

const makeRequest = (): Request =>
  ({
    requestId: 'request-id',
    svc_key: 'service-key',
    api: {
      tenantPool: {},
      anonRole: 'anonymous',
      roleName: 'authenticated',
      schema: ['app_public'],
      databaseId: 'database-id'
    },
    get: jest.fn((): undefined => undefined)
  }) as unknown as Request;

describe('isGraphiqlEnabled', () => {
  it.each([
    [undefined, 'production', false],
    [undefined, 'development', true],
    [undefined, 'test', true],
    [undefined, undefined, true],
    [{ graphiql: true }, 'production', true],
    [{ graphiql: false }, 'development', false],
    [{ graphiql: false }, undefined, false]
  ])('for graphile=%j when NODE_ENV=%s returns %s', (graphileOptions, nodeEnv, expected) => {
    expect(isGraphiqlEnabled(graphileOptions, nodeEnv)).toBe(expected);
  });
});

describe('graphile preset grafserv.graphiql wiring', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearInFlightMap();
    clearGenerations();
    mockCacheGet.mockReset().mockReturnValue(undefined);
    mockCacheGraphileInstance.mockReset().mockResolvedValue(undefined);
    mockCreateGraphileInstance.mockReset().mockResolvedValue({
      handler: jest.fn()
    });
    mockMakeIntrospectionWiring.mockReset().mockReturnValue({
      presets: [],
      pgService: {},
      pgScopedIntrospection: { main: true }
    });
    mockCreateGrafastCacheLimitsPreset.mockReset().mockReturnValue({});
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('disables GraphiQL in production by default', async () => {
    process.env.NODE_ENV = 'production';

    const middleware = graphile({});
    await middleware(makeRequest(), {} as Response, jest.fn());

    expect(mockCreateGraphileInstance).toHaveBeenCalledTimes(1);
    const { preset } = mockCreateGraphileInstance.mock.calls[0][0];
    expect(preset.grafserv.graphiql).toBe(false);
    expect(preset.grafserv.graphiqlOnGraphQLGET).toBe(false);
  });

  it('enables GraphiQL in development by default', async () => {
    process.env.NODE_ENV = 'development';

    const middleware = graphile({});
    await middleware(makeRequest(), {} as Response, jest.fn());

    expect(mockCreateGraphileInstance).toHaveBeenCalledTimes(1);
    const { preset } = mockCreateGraphileInstance.mock.calls[0][0];
    expect(preset.grafserv.graphiql).toBe(true);
  });

  it('honors explicit graphile.graphiql override in production and development', async () => {
    process.env.NODE_ENV = 'production';
    const enabledInProd = graphile({ graphile: { graphiql: true } });
    await enabledInProd(makeRequest(), {} as Response, jest.fn());
    expect(mockCreateGraphileInstance.mock.calls[0][0].preset.grafserv.graphiql).toBe(true);

    mockCreateGraphileInstance.mockClear();
    process.env.NODE_ENV = 'development';
    const disabledInDev = graphile({ graphile: { graphiql: false } });
    await disabledInDev(makeRequest(), {} as Response, jest.fn());
    expect(mockCreateGraphileInstance.mock.calls[0][0].preset.grafserv.graphiql).toBe(false);
  });

  it('serves 404 for /graphiql and /ruru-static/* while keeping POST /graphql working when disabled', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          ping: {
            type: GraphQLString,
            resolve: () => 'pong'
          }
        }
      })
    });

    const startTestServer = async (graphiqlFlag: boolean) => {
      const app = express();
      const serv = grafserv({
        schema,
        preset: {
          grafserv: {
            graphqlPath: '/graphql',
            graphiqlPath: '/graphiql',
            graphiql: graphiqlFlag,
            graphiqlOnGraphQLGET: false
          }
        }
      });
      const graphiqlSpy = jest
        .spyOn(serv, 'graphiqlHandler')
        .mockImplementation(async (request) => ({
          type: 'html',
          request,
          dynamicOptions: serv.dynamicOptions,
          statusCode: 200,
          payload: Buffer.from('<!doctype html><html><body>GraphiQL</body></html>')
        }));
      await serv.addTo(app, null);
      app.use(notFoundHandler);
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address() as AddressInfo;
      return {
        baseUrl: `http://127.0.0.1:${port}`,
        graphiqlSpy,
        close: async () => {
          await serv.release();
          await new Promise<void>((resolve, reject) =>
            server.close((err) => (err ? reject(err) : resolve()))
          );
        }
      };
    };

    const prodServer = await startTestServer(isGraphiqlEnabled(undefined, 'production'));
    try {
      const graphiqlRes = await fetch(`${prodServer.baseUrl}/graphiql`, {
        headers: { Accept: 'text/html' }
      });
      expect(graphiqlRes.status).toBe(404);
      expect(prodServer.graphiqlSpy).not.toHaveBeenCalled();

      const staticRes = await fetch(`${prodServer.baseUrl}/ruru-static/ruru.js`);
      expect(staticRes.status).toBe(404);

      const gqlRes = await fetch(`${prodServer.baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ ping __schema { queryType { name } } }' })
      });
      expect(gqlRes.status).toBe(200);
      expect(await gqlRes.json()).toEqual({
        data: { ping: 'pong', __schema: { queryType: { name: 'Query' } } }
      });
    } finally {
      await prodServer.close();
    }

    const devServer = await startTestServer(isGraphiqlEnabled(undefined, 'development'));
    try {
      const graphiqlRes = await fetch(`${devServer.baseUrl}/graphiql`, {
        headers: { Accept: 'text/html' }
      });
      expect(graphiqlRes.status).toBe(200);
      expect(graphiqlRes.headers.get('content-type')).toContain('text/html');
      expect(devServer.graphiqlSpy).toHaveBeenCalledTimes(1);
    } finally {
      await devServer.close();
    }
  });
});
