import { svcCache } from '@pgpmjs/server-utils';
import type { PgpmOptions } from '@pgpmjs/types';
import type { Request } from 'express';

import { getSvcKey, queryServiceByApiName } from '../src/middleware/api';
import { normalizeApiRecord } from '../src/middleware/gql';
import type { ConnectionResult } from '../src/codegen/orm/select-types';

type ApiRecord = Parameters<typeof normalizeApiRecord>[0];
type ApiQueryOps = Parameters<typeof queryServiceByApiName>[0]['queryOps'];
type QueryResult<T> = { ok: true; data: T; errors: undefined };

const connection = <T>(nodes: T[]): ConnectionResult<T> => ({
  nodes,
  totalCount: nodes.length,
  pageInfo: { hasNextPage: false, hasPreviousPage: false },
});

describe('api middleware helpers', () => {
  afterEach(() => {
    svcCache.clear();
  });

  it('merges schema nodes into api.schema', () => {
    const api: ApiRecord = {
      dbname: 'db1',
      anonRole: 'anon',
      roleName: 'role',
      databaseId: 'db-1',
      isPublic: false,
      domains: connection([]),
      apiExtensions: connection([{ schemaName: 'ext_schema' }]),
      schemasByApiSchemaApiIdAndSchemaId: connection([
        { schemaName: 'app_public' },
      ]),
      apiModules: connection([]),
      rlsModule: null,
    };
    const result = normalizeApiRecord(api);

    expect(result.schema).toEqual(['ext_schema', 'app_public']);
  });

  it('builds domains from api domains', () => {
    const api: ApiRecord = {
      dbname: 'db1',
      anonRole: 'anon',
      roleName: 'role',
      databaseId: 'db-1',
      isPublic: false,
      domains: connection([
        { domain: 'example.com', subdomain: 'api' },
        { domain: 'localhost', subdomain: 'dev' },
        { domain: 'example.org', subdomain: '' },
        { domain: 'example.net', subdomain: '' },
      ]),
      apiExtensions: connection([]),
      schemasByApiSchemaApiIdAndSchemaId: connection([]),
      apiModules: connection([]),
      rlsModule: null,
    };

    const result = normalizeApiRecord(api);

    expect(result.domains).toEqual([
      'https://api.example.com',
      'http://dev.localhost',
      'https://example.org',
      'https://example.net',
    ]);
  });

  it('prefers X-Schemata when building svc key', () => {
    const req = {
      urlDomains: { domain: 'example.com', subdomains: ['api'] },
      get: (header: string) => {
        switch (header) {
          case 'X-Database-Id':
            return 'db-123';
          case 'X-Api-Name':
            return 'public';
          case 'X-Schemata':
            return 'app_public,app_private';
          default:
            return undefined;
        }
      },
    } as unknown as Request;

    const opts = { api: { isPublic: false } } as PgpmOptions;

    expect(getSvcKey(opts, req)).toBe('schemata:db-123:app_public,app_private');
  });

  it('normalizes apiByDatabaseIdAndName into ApiStructure', async () => {
    const api: ApiRecord = {
      dbname: 'db1',
      anonRole: 'anon',
      roleName: 'role',
      databaseId: 'db-1',
      isPublic: false,
      domains: connection([]),
      apiExtensions: connection([]),
      schemasByApiSchemaApiIdAndSchemaId: connection([
        { schemaName: 'app_public' },
      ]),
      apiModules: connection([]),
      rlsModule: null,
    };

    const execute = jest
      .fn<Promise<QueryResult<{ apiByDatabaseIdAndName: ApiRecord }>>, []>()
      .mockResolvedValue({
        ok: true,
        data: { apiByDatabaseIdAndName: api },
        errors: undefined,
      });
    const queryOps: ApiQueryOps = {
      apiByDatabaseIdAndName: jest
        .fn()
        .mockReturnValue({ execute }) as ApiQueryOps['apiByDatabaseIdAndName'],
    };

    const opts = { api: { isPublic: false } } as PgpmOptions;

    const svc = await queryServiceByApiName({
      opts,
      key: 'api:db-1:public',
      queryOps,
      databaseId: 'db-1',
      name: 'public',
    });

    expect(svc?.dbname).toBe('db1');
    expect(svc?.schema).toEqual(['app_public']);
  });

  it('returns null when X-Api-Name has no databaseId', async () => {
    const queryOps: ApiQueryOps = {
      apiByDatabaseIdAndName:
        jest.fn() as ApiQueryOps['apiByDatabaseIdAndName'],
    };

    const opts = { api: { isPublic: false } } as PgpmOptions;

    const svc = await queryServiceByApiName({
      opts,
      key: 'api:missing-db:public',
      queryOps,
      databaseId: undefined,
      name: 'public',
    });

    expect(svc).toBeNull();
    expect(queryOps.apiByDatabaseIdAndName).not.toHaveBeenCalled();
  });
});
