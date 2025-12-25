process.env.LOG_SCOPE = 'graphile-test';

import { readdirSync } from 'fs';
import { join } from 'path';

import type { Express } from 'express';
import { closeAllCaches } from 'graphile-cache';
import { seed, getConnections } from 'graphile-test';
import { svcCache } from '@pgpmjs/server-utils';
import request from 'supertest';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { generateCreateBaseRolesSQL } from '@pgpmjs/core';

import { Server } from '../src/server';

jest.setTimeout(180000);

const metaSvcPath = join(
  __dirname,
  '../../../../constructive-db/services/svc-local'
);
const appSqlDir = join(__dirname, '../../test/sql');
const getAppSqlFiles = () =>
  readdirSync(appSqlDir)
    .filter((file) => file.endsWith('.sql'))
    .map((file) => join(appSqlDir, file))
    .sort();

const baseRolesSeed = seed.fn(async (ctx: any) => {
  const sqlText = generateCreateBaseRolesSQL(ctx.connect.roles);
  await ctx.admin.streamSql(sqlText, ctx.config.database);
});

const buildApp = (opts: Record<string, any>): Express => {
  const server = new Server(getEnvOptions(opts));
  return (server as any).app as Express;
};

const applyHeaders = (
  req: request.Test,
  headers: Record<string, string> | undefined
) => {
  if (!headers) return req;
  for (const [key, value] of Object.entries(headers)) {
    req.set(key, value);
  }
  return req;
};

const expectOk = async (req: request.Test, label: string) => {
  const res = await req;
  if (res.status !== 200) {
    const body = res.text || JSON.stringify(res.body);
    throw new Error(`${label} expected 200, got ${res.status}: ${body}`);
  }
  return res;
};

const runBasicChecks = async (app: Express, headers?: Record<string, string>) => {
  await expectOk(request(app).get('/healthz'), 'GET /healthz');

  const graphiqlRes = await expectOk(
    applyHeaders(request(app).get('/graphiql'), headers),
    'GET /graphiql'
  );
  expect(graphiqlRes.headers['content-type']).toMatch(/text\/html/);

  const postRes = await expectOk(
    applyHeaders(
      request(app).post('/graphql').send({ query: '{ __typename }' }),
      headers
    ),
    'POST /graphql'
  );
  expect(postRes.body?.data?.__typename).toBe('Query');
};

type SeedDbContext = {
  name: string;
  pgConfig: { host: string; port: number; user: string; password: string; database: string };
  teardown: () => Promise<void>;
};

type MetaHosts = {
  publicHost: string;
  privateHost: string;
};

let metaDb: SeedDbContext;
let appDb: SeedDbContext;
let metaHosts: MetaHosts;

const pickApiHost = async (pg: any, isPublic: boolean): Promise<string> => {
  const row = (await pg.oneOrNone(
    `
      select d.domain, d.subdomain
      from meta_public.domains d
      join meta_public.apis a on a.id = d.api_id
      where a.is_public = $1
      order by d.domain, d.subdomain
      limit 1
    `,
    [isPublic]
  )) as { domain: string; subdomain: string | null } | null;

  if (!row) {
    throw new Error(`No meta domain found for is_public=${isPublic}`);
  }

  return row.subdomain ? `${row.subdomain}.${row.domain}` : row.domain;
};

beforeAll(async () => {
  const metaConn = await getConnections(
    { schemas: ['meta_public'] },
    [baseRolesSeed, seed.pgpm(metaSvcPath)]
  );

  const appConn = await getConnections(
    { schemas: ['app_public'] },
    [baseRolesSeed, seed.sqlfile(getAppSqlFiles())]
  );

  metaDb = {
    name: 'meta',
    pgConfig: metaConn.pg.config,
    teardown: metaConn.teardown
  };

  appDb = {
    name: 'no-meta',
    pgConfig: appConn.pg.config,
    teardown: appConn.teardown
  };

  metaHosts = {
    publicHost: await pickApiHost(metaConn.pg, true),
    privateHost: await pickApiHost(metaConn.pg, false)
  };
});

afterAll(async () => {
  await metaDb.teardown();
  await appDb.teardown();
  svcCache.clear();
  await closeAllCaches();
});

afterEach(() => {
  svcCache.clear();
});

const cases = [
  {
    name: 'meta enabled, public',
    enableMetaApi: true,
    isPublic: true,
    seed: () => metaDb,
    getHeaders: () => ({ Host: metaHosts.publicHost }),
  },
  {
    name: 'meta enabled, private',
    enableMetaApi: true,
    isPublic: false,
    seed: () => metaDb,
    getHeaders: () => ({ Host: metaHosts.privateHost }),
  },
  {
    name: 'meta disabled, public',
    enableMetaApi: false,
    isPublic: true,
    seed: () => appDb,
  },
  {
    name: 'meta disabled, private',
    enableMetaApi: false,
    isPublic: false,
    seed: () => appDb,
  },
];

describe('basic URLs', () => {
  for (const testCase of cases) {
    it(testCase.name, async () => {
      const seedCtx = testCase.seed();
      const headers = testCase.getHeaders ? testCase.getHeaders() : undefined;
      const app = buildApp({
        pg: seedCtx.pgConfig,
        api: {
          enableMetaApi: testCase.enableMetaApi,
          isPublic: testCase.isPublic,
          ...(testCase.enableMetaApi
            ? { metaSchemas: ['collections_public', 'meta_public'] }
            : {
                exposedSchemas: ['app_public'],
                anonRole: 'authenticated',
                roleName: 'authenticated',
                defaultDatabaseId: 'test-db',
              })
        }
      });

      await runBasicChecks(app, headers);
    });
  }
});
