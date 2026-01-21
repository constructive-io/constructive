process.env.LOG_SCOPE = 'graphile-test';

import { join } from 'path';
import type { Request, Response } from 'express';
import { seed, getConnections } from 'graphile-test';
import { close as closePgPools } from 'pg-cache';
import { svcCache } from '@pgpmjs/server-utils';
import type { PgpmOptions } from '@pgpmjs/types';

import { createApiMiddleware } from '../src/middleware/api';
import type { ApiStructure } from '../src/types';

jest.setTimeout(30000);

const schemas = ['app_public'];
const sql = (file: string) => join(__dirname, '../../test/sql', file);

let db: any;
let teardown: () => Promise<void>;

beforeAll(async () => {
  const connections = await getConnections({ schemas }, [
    seed.sqlfile([sql('test.sql'), sql('grants.sql')]),
  ]);
  ({ db, teardown } = connections);
});

afterAll(async () => {
  await closePgPools();
  await teardown();
});

afterEach(() => {
  svcCache.clear();
});

it('resolves api config from X-Schemata header', async () => {
  const middleware = createApiMiddleware({
    pg: {
      database: db.config.database,
      user: db.config.user,
      password: db.config.password,
      host: db.config.host,
      port: db.config.port,
    },
    api: {
      isPublic: false,
      metaSchemas: schemas,
    },
  } as PgpmOptions);

  const req = {
    urlDomains: { domain: 'example.com', subdomains: [] },
    get: (header: string) => {
      switch (header) {
        case 'X-Database-Id':
          return 'db-123';
        case 'X-Schemata':
          return 'app_public';
        default:
          return undefined;
      }
    },
  } as unknown as Request & { api?: ApiStructure; svc_key?: string };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;

  const next = jest.fn();

  await middleware(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.api?.schema).toEqual(['app_public']);
  expect(req.api?.databaseId).toBe('db-123');
  expect(req.svc_key).toBe('schemata:db-123:app_public');
  expect(res.status).not.toHaveBeenCalled();
});
