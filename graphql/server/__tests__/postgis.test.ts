process.env.LOG_SCOPE = 'graphile-test';

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import type { Server as HttpServer } from 'http';
import request from 'supertest';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { PgpmInit, PgpmMigrate } from '@pgpmjs/core';
import { svcCache } from '@pgpmjs/server-utils';
import { graphileCache } from 'graphile-cache';
import { seed, getConnections } from 'pgsql-test';
import { Server as GraphQLServer } from '../src/server';

jest.setTimeout(30000);

const metaSchemas = ['metaschema_public', 'services_public', 'metaschema_modules_public'];
const metaSql = (f: string) => join(__dirname, '../__fixtures__/sql', f);
const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';

const hosts = {
  api: 'api.example.com',
};

const metaDbExtensions = [
  'citext',
  'uuid-ossp',
  'unaccent',
  'pgcrypto',
  'hstore',
  'postgis',
];

const getPgpmModulePath = (pkgName: string): string =>
  dirname(require.resolve(`${pkgName}/pgpm.plan`));

const metaSeedModules = [
  getPgpmModulePath('@pgpm/verify'),
  getPgpmModulePath('@pgpm/types'),
  getPgpmModulePath('@pgpm/inflection'),
  getPgpmModulePath('@pgpm/database-jobs'),
  getPgpmModulePath('@pgpm/metaschema-schema'),
  getPgpmModulePath('@pgpm/services'),
  getPgpmModulePath('@pgpm/metaschema-modules'),
];

type PgsqlConnections = Awaited<ReturnType<typeof getConnections>>;
type PgTestClient = PgsqlConnections['db'];
type SeededConnections = Pick<PgsqlConnections, 'db' | 'pg' | 'teardown'>;

const bootstrapAdminUsers = seed.fn(async ({ admin, config, connect }) => {
  const roles = connect?.roles;
  const connections = connect?.connections;

  if (!roles || !connections) {
    throw new Error('Missing pgpm role or connection defaults for admin users.');
  }

  const init = new PgpmInit(config);
  try {
    await init.bootstrapRoles(roles);
    await init.bootstrapTestRoles(roles, connections);
  } finally {
    await init.close();
  }

  const appUser = connections.app?.user;
  if (appUser) {
    await admin.grantRole(roles.administrator, appUser, config.database);
  }
});

const deployMetaModules = seed.fn(async ({ config }) => {
  const migrator = new PgpmMigrate(config);
  for (const modulePath of metaSeedModules) {
    const result = await migrator.deploy({ modulePath, usePlan: true });
    if (result.failed) {
      throw new Error(`Failed to deploy ${modulePath}: ${result.failed}`);
    }
  }
});

const deployGeoTypesModule = seed.fn(async ({ config, pg }) => {
  const available = await pg.query(
    `SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'`
  );
  if (available.rowCount === 0) {
    throw new Error('PostGIS extension is not available for this test database.');
  }

  const modulePath = getPgpmModulePath('@pgpm/geotypes');

  const migrator = new PgpmMigrate(config);
  const result = await migrator.deploy({ modulePath, usePlan: true });
  if (result.failed) {
    throw new Error(`Failed to deploy ${modulePath}: ${result.failed}`);
  }
});

const seedPostgisData = seed.fn(async ({ pg }) => {
  const sql = readFileSync(metaSql('postgis.seed.sql'), 'utf8');
  await pg.query(sql);
});

const requireConnections = (
  connections: SeededConnections | null,
  label: string
): SeededConnections => {
  if (!connections) {
    throw new Error(`${label} connections not initialized`);
  }
  return connections;
};

const setHeaders = <T extends { set: (field: string, value: string) => T }>(
  req: T,
  headers?: Record<string, string>
): T => {
  if (!headers) return req;
  for (const [key, value] of Object.entries(headers)) {
    req.set(key, value);
  }
  return req;
};

type StartedServer = {
  server: GraphQLServer;
  httpServer: HttpServer;
};

const clearCaches = (): void => {
  svcCache.clear();
  graphileCache.clear();
};

const startServer = async (
  opts: ConstructiveOptions
): Promise<StartedServer> => {
  const server = new GraphQLServer(opts);
  server.addEventListener();

  const httpServer = server.listen();
  if (!httpServer.listening) {
    await new Promise<void>((resolve) => {
      httpServer.once('listening', () => resolve());
    });
  }

  return { server, httpServer };
};

const stopServer = async (started: StartedServer | null): Promise<void> => {
  if (!started) return;

  await started.server.close();
  await new Promise<void>((resolve, reject) => {
    started.httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const createMetaDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: metaDbExtensions } },
    [
      bootstrapAdminUsers,
      deployMetaModules,
      seed.sqlfile([metaSql('auth.seed.sql'), metaSql('meta-schema.seed.sql')]),
      deployGeoTypesModule,
      seedPostgisData,
    ]
  );

  await db.begin();
  db.setContext({
    role: 'administrator',
    'jwt.claims.database_id': seededDatabaseId,
  });
  try {
    await db.query('UPDATE services_public.apis SET dbname = current_database()');
    await db.commit();
  } catch (error) {
    await db.client.query('ROLLBACK;');
    throw error;
  } finally {
    db.clearContext();
  }

  return { db, pg, teardown };
};

const buildOptions = ({
  db,
}: {
  db: PgTestClient;
}): ConstructiveOptions => {
  return getEnvOptions({
    pg: {
      host: db.config.host,
      port: db.config.port,
      user: db.config.user,
      password: db.config.password,
      database: db.config.database,
    },
    server: {
      host: '127.0.0.1',
      port: 0,
    },
    api: {
      enableMetaApi: true,
      isPublic: true,
      metaSchemas,
    },
  });
};

let metaDb: SeededConnections | null = null;

beforeAll(async () => {
  metaDb = await createMetaDb();
});

afterAll(async () => {
  await GraphQLServer.closeCaches({ closePools: true });
  if (metaDb) {
    await metaDb.teardown();
  }
});

describe('PostGIS', () => {
  let started: StartedServer | null = null;
  let db: PgTestClient;

  beforeAll(async () => {
    const connections = requireConnections(metaDb, 'meta');
    db = connections.db;
    started = await startServer(
      buildOptions({
        db,
      })
    );
  });

  beforeEach(async () => {
    db.setContext({
      role: 'anonymous',
      'jwt.claims.database_id': seededDatabaseId,
    });
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
  });

  afterAll(async () => {
    await stopServer(started);
    started = null;
    clearCaches();
  });

  it('exposes PostGIS types when enabled', async () => {
    if (!started) {
      throw new Error('HTTP server not started');
    }

    const req = request.agent(started.httpServer);
    setHeaders(req, { Host: hosts.api });
    const res = await req.post('/graphql').send({
      query: `{
        geojson: __type(name: "GeoJSON") { name }
        geometryPoint: __type(name: "GeometryPoint") { name }
        geoPoint: __type(name: "GeoPoint") {
          fields {
            name
            type {
              name
              kind
              ofType { name kind ofType { name kind } }
            }
          }
        }
      }`,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.geojson?.name).toBe('GeoJSON');
    expect(res.body.data.geometryPoint?.name).toBe('GeometryPoint');

    const geomField = res.body.data.geoPoint?.fields?.find(
      (field: any) => field.name === 'geom'
    );
    expect(geomField).toBeTruthy();

    const getNamedType = (type: any): string | null => {
      let current = type;
      while (current?.ofType) {
        current = current.ofType;
      }
      return current?.name ?? null;
    };

    const geomTypeName = getNamedType(geomField.type);
    expect(['GeometryPoint', 'GeoJSON']).toContain(geomTypeName);
  });
});
