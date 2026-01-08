import { readFile } from 'fs/promises';
import { createServer } from 'net';
import { dirname, join } from 'path';
import supertest from 'supertest';

import { PgpmInit, PgpmMigrate } from '@pgpmjs/core';
import { getConnections, seed, type PgTestClient } from 'pgsql-test';

import type { CombinedServer as CombinedServerType } from '../src/server';
import type { CombinedServerOptions, FunctionServiceConfig } from '../src/types';

jest.setTimeout(120000);

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type GraphqlClient = {
  http: ReturnType<typeof supertest>;
  path: string;
  host?: string;
};

const buildGraphqlClient = (
  rawUrl: string,
  host?: string
): GraphqlClient => {
  const parsed = new URL(rawUrl);
  const origin = `${parsed.protocol}//${parsed.host}`;
  const path =
    parsed.pathname === '/' ? '/graphql' : `${parsed.pathname}${parsed.search}`;

  return {
    http: supertest(origin),
    path,
    host
  };
};

const getGraphqlClient = (): GraphqlClient => {
  const rawUrl =
    process.env.TEST_GRAPHQL_URL ||
    process.env.GRAPHQL_URL ||
    'http://localhost:3000/graphql';
  const host = process.env.TEST_GRAPHQL_HOST || process.env.GRAPHQL_HOST;

  return buildGraphqlClient(rawUrl, host);
};

const sendGraphql = async (
  client: GraphqlClient,
  query: string,
  variables?: Record<string, unknown>
) => {
  let req = client.http
    .post(client.path)
    .set('Content-Type', 'application/json');
  if (client.host) {
    req = req.set('Host', client.host);
  }
  return req.send({ query, variables });
};

const addJobMutation = `
  mutation AddJob($input: AddJobInput!) {
    addJob(input: $input) {
      job {
        id
      }
    }
  }
`;

const jobByIdQuery = `
  query JobById($id: BigInt!) {
    job(id: $id) {
      id
      lastError
      attempts
    }
  }
`;

const unwrapGraphqlData = <T>(
  response: supertest.Response,
  label: string
): T => {
  if (response.status !== 200) {
    throw new Error(`${label} failed: HTTP ${response.status}`);
  }
  if (response.body?.errors?.length) {
    throw new Error(
      `${label} failed: ${response.body.errors
        .map((err: { message: string }) => err.message)
        .join('; ')}`
    );
  }
  if (!response.body?.data) {
    throw new Error(`${label} returned no data`);
  }
  return response.body.data as T;
};

const getJobById = async (
  client: GraphqlClient,
  jobId: string | number
) => {
  const response = await sendGraphql(client, jobByIdQuery, {
    id: String(jobId)
  });
  const data = unwrapGraphqlData<{ job: { lastError?: string | null; attempts?: number } | null }>(
    response,
    'Job query'
  );
  return data.job;
};

const waitForJobCompletion = async (
  client: GraphqlClient,
  jobId: string | number
) => {
  const timeoutMs = 30000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const job = await getJobById(client, jobId);

    if (!job) return;

    if (job.lastError) {
      const attempts = job.attempts ?? 0;
      throw new Error(`Job ${jobId} failed after ${attempts} attempt(s): ${job.lastError}`);
    }

    await delay(250);
  }

  throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
};

const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';
const metaDbExtensions = ['citext', 'uuid-ossp', 'unaccent', 'pgcrypto', 'hstore'];

const getPgpmModulePath = (pkgName: string): string =>
  dirname(require.resolve(`${pkgName}/pgpm.plan`));

const metaSeedModules = [
  getPgpmModulePath('@pgpm/verify'),
  getPgpmModulePath('@pgpm/types'),
  getPgpmModulePath('@pgpm/inflection'),
  getPgpmModulePath('@pgpm/database-jobs'),
  getPgpmModulePath('@pgpm/metaschema-schema'),
  getPgpmModulePath('@pgpm/services'),
  getPgpmModulePath('@pgpm/metaschema-modules')
];

const sql = (f: string) => join(__dirname, '..', '__fixtures__', f);

type SeededConnections = {
  db: PgTestClient;
  pg: PgTestClient;
  teardown: () => Promise<void>;
};

type PgConfigLike = PgTestClient['config'];

const runMetaMigrations = async (config: PgConfigLike) => {
  const migrator = new PgpmMigrate(config);
  for (const modulePath of metaSeedModules) {
    const result = await migrator.deploy({ modulePath, usePlan: true });
    if (result.failed) {
      throw new Error(`Failed to deploy ${modulePath}: ${result.failed}`);
    }
  }
};

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
  await runMetaMigrations(config);
});

const createTestDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: metaDbExtensions } },
    [
      bootstrapAdminUsers,
      deployMetaModules,
      seed.sqlfile([sql('jobs.seed.sql')])
    ]
  );

  return { db, pg, teardown };
};

const hasSchema = async (client: PgTestClient, schema: string) => {
  const row = await client.oneOrNone<{ schema_name: string }>(
    'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
    [schema]
  );
  return Boolean(row?.schema_name);
};

const ensureJobsSchema = async (client: PgTestClient) => {
  if (await hasSchema(client, 'app_jobs')) return;
  await runMetaMigrations(client.config);
  if (!(await hasSchema(client, 'app_jobs'))) {
    throw new Error('app_jobs schema was not created by pgpm migrations');
  }
};

const getAvailablePort = (): Promise<number> =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to allocate a port')));
        return;
      }
      const port = address.port;
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolvePort(port);
      });
    });
    server.on('error', reject);
  });

const waitForReady = async (
  label: string,
  check: () => Promise<boolean>,
  timeoutMs = 30000,
  getLastError?: () => string | undefined
) => {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      if (await check()) return;
    } catch {
      // ignore and retry
    }
    await delay(500);
  }

  const lastError = getLastError?.();
  if (lastError) {
    throw new Error(
      `${label} did not become ready within ${timeoutMs}ms. Last error: ${lastError}`
    );
  }
  throw new Error(`${label} did not become ready within ${timeoutMs}ms.`);
};

const waitForGraphql = async (client: GraphqlClient) => {
  let lastError: string | undefined;
  await waitForReady(
    'GraphQL server',
    async () => {
      const response = await sendGraphql(client, '{ __typename }');
      if (response.status !== 200) {
        const detail =
          response.text ||
          (response.body ? JSON.stringify(response.body) : undefined);
        lastError = detail
          ? `HTTP ${response.status}: ${detail}`
          : `HTTP ${response.status}`;
        return false;
      }
      if (response.body?.errors?.length) {
        lastError = response.body.errors
          .map((err: { message: string }) => err.message)
          .join('; ');
        return false;
      }
      lastError = undefined;
      return true;
    },
    30000,
    () => lastError
  );
};

const waitForCallbackServer = async (callbackUrl: string) => {
  const origin = callbackUrl.replace(/\/callback$/, '');
  const http = supertest(origin);
  await waitForReady('Jobs callback server', async () => {
    const response = await http.post('/callback').send({});
    return response.status === 200;
  });
};

describe('jobs e2e', () => {
  let teardown: () => Promise<void>;
  let graphqlClient: GraphqlClient;
  let databaseId = '';
  let pg: PgTestClient | undefined;
  let combinedServer: CombinedServerType | null = null;
  const envSnapshot: Record<string, string | undefined> = {
    NODE_ENV: process.env.NODE_ENV,
    TEST_DB: process.env.TEST_DB,
    PGHOST: process.env.PGHOST,
    PGPORT: process.env.PGPORT,
    PGUSER: process.env.PGUSER,
    PGPASSWORD: process.env.PGPASSWORD,
    PGDATABASE: process.env.PGDATABASE,
    TEST_DATABASE_ID: process.env.TEST_DATABASE_ID,
    DEFAULT_DATABASE_ID: process.env.DEFAULT_DATABASE_ID,
    TEST_GRAPHQL_URL: process.env.TEST_GRAPHQL_URL,
    TEST_GRAPHQL_HOST: process.env.TEST_GRAPHQL_HOST,
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    META_GRAPHQL_URL: process.env.META_GRAPHQL_URL,
    SIMPLE_EMAIL_DRY_RUN: process.env.SIMPLE_EMAIL_DRY_RUN,
    SEND_EMAIL_LINK_DRY_RUN: process.env.SEND_EMAIL_LINK_DRY_RUN,
    LOCAL_APP_PORT: process.env.LOCAL_APP_PORT,
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    MAILGUN_FROM: process.env.MAILGUN_FROM,
    MAILGUN_REPLY: process.env.MAILGUN_REPLY,
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
    MAILGUN_KEY: process.env.MAILGUN_KEY,
    JOBS_SUPPORT_ANY: process.env.JOBS_SUPPORT_ANY,
    JOBS_SUPPORTED: process.env.JOBS_SUPPORTED,
    INTERNAL_GATEWAY_DEVELOPMENT_MAP:
      process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP,
    INTERNAL_JOBS_CALLBACK_PORT: process.env.INTERNAL_JOBS_CALLBACK_PORT,
    JOBS_CALLBACK_BASE_URL: process.env.JOBS_CALLBACK_BASE_URL,
    FEATURES_POSTGIS: process.env.FEATURES_POSTGIS
  };

  beforeAll(async () => {
    delete process.env.TEST_DB;
    delete process.env.PGDATABASE;

    ({ teardown, pg } = await createTestDb());
    if (!pg) {
      throw new Error('Test database connection is missing');
    }
    await ensureJobsSchema(pg);

    databaseId = seededDatabaseId;
    if (pg?.oneOrNone) {
      const row = await pg.oneOrNone<{ id: string }>(
        'SELECT id FROM metaschema_public.database WHERE id = $1',
        [databaseId]
      );
      if (!row?.id) {
        const seedSql = await readFile(sql('jobs.seed.sql'), 'utf8');
        await pg.query(seedSql);
        const seeded = await pg.oneOrNone<{ id: string }>(
          'SELECT id FROM metaschema_public.database WHERE id = $1',
          [databaseId]
        );
        if (!seeded?.id) {
          throw new Error(`Seeded database id ${databaseId} was not found`);
        }
      }
    }

    if (!pg?.config.database) {
      throw new Error('Test database config is missing a database name');
    }

    const ports = {
      graphqlPort: await getAvailablePort(),
      callbackPort: await getAvailablePort(),
      simpleEmailPort: await getAvailablePort(),
      sendEmailLinkPort: await getAvailablePort()
    };

    const graphqlUrl = `http://127.0.0.1:${ports.graphqlPort}/graphql`;
    const callbackUrl = `http://127.0.0.1:${ports.callbackPort}/callback`;

    process.env.NODE_ENV = 'test';
    process.env.PGDATABASE = pg.config.database;
    process.env.TEST_DATABASE_ID = databaseId;
    process.env.DEFAULT_DATABASE_ID = databaseId;
    process.env.TEST_GRAPHQL_URL = graphqlUrl;
    process.env.GRAPHQL_URL = graphqlUrl;
    process.env.META_GRAPHQL_URL = graphqlUrl;
    process.env.SIMPLE_EMAIL_DRY_RUN = 'true';
    process.env.SEND_EMAIL_LINK_DRY_RUN = 'true';
    process.env.LOCAL_APP_PORT = String(ports.graphqlPort);
    process.env.MAILGUN_DOMAIN = 'mg.constructive.io';
    process.env.MAILGUN_FROM = 'no-reply@mg.constructive.io';
    process.env.MAILGUN_REPLY = 'info@mg.constructive.io';
    process.env.MAILGUN_API_KEY = 'change-me-mailgun-api-key';
    process.env.MAILGUN_KEY = 'change-me-mailgun-api-key';
    process.env.JOBS_SUPPORT_ANY = 'false';
    process.env.JOBS_SUPPORTED = 'simple-email,send-email-link';
    process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP = JSON.stringify({
      'simple-email': `http://127.0.0.1:${ports.simpleEmailPort}`,
      'send-email-link': `http://127.0.0.1:${ports.sendEmailLinkPort}`
    });
    process.env.INTERNAL_JOBS_CALLBACK_PORT = String(ports.callbackPort);
    process.env.JOBS_CALLBACK_BASE_URL = callbackUrl;
    process.env.FEATURES_POSTGIS = 'false';

    if (pg.config.host) process.env.PGHOST = pg.config.host;
    if (pg.config.port) process.env.PGPORT = String(pg.config.port);
    if (pg.config.user) process.env.PGUSER = pg.config.user;
    if (pg.config.password) process.env.PGPASSWORD = pg.config.password;

    const services: FunctionServiceConfig[] = [
      { name: 'simple-email', port: ports.simpleEmailPort },
      { name: 'send-email-link', port: ports.sendEmailLinkPort }
    ];

    const combinedServerOptions: CombinedServerOptions = {
      graphql: {
        enabled: true,
        options: {
          pg: {
            host: pg.config.host,
            port: pg.config.port,
            user: pg.config.user,
            password: pg.config.password,
            database: pg.config.database
          },
          server: {
            host: '127.0.0.1',
            port: ports.graphqlPort
          },
          api: {
            enableMetaApi: false,
            exposedSchemas: [
              'app_jobs',
              'app_public',
              'metaschema_modules_public',
              'metaschema_public',
              'services_public'
            ],
            anonRole: 'administrator',
            roleName: 'administrator',
            defaultDatabaseId: databaseId
          },
          features: {
            postgis: false
          }
        }
      },
      functions: {
        enabled: true,
        services
      },
      jobs: { enabled: true }
    };

    const { CombinedServer } = await import('../src/server');
    combinedServer = new CombinedServer(combinedServerOptions);
    await combinedServer.start();

    graphqlClient = getGraphqlClient();
    await waitForGraphql(graphqlClient);
    await waitForCallbackServer(callbackUrl);
  });

  afterAll(async () => {
    if (combinedServer) {
      await combinedServer.stop();
    }
    if (teardown) {
      await teardown();
    }
    for (const [key, value] of Object.entries(envSnapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('creates and processes a simple-email job', async () => {
    const jobInput = {
      dbId: databaseId,
      identifier: 'simple-email',
      payload: {
        to: 'user@example.com',
        subject: 'Jobs e2e',
        html: '<p>jobs test</p>'
      }
    };

    const response = await sendGraphql(graphqlClient, addJobMutation, {
      input: jobInput
    });

    expect(response.status).toBe(200);
    expect(response.body?.errors).toBeUndefined();

    const jobId = response.body?.data?.addJob?.job?.id;

    expect(jobId).toBeTruthy();

    await waitForJobCompletion(graphqlClient, jobId);
  });

  it('creates and processes a send-email-link job', async () => {
    const jobInput = {
      dbId: databaseId,
      identifier: 'send-email-link',
      payload: {
        email_type: 'invite_email',
        email: 'user@example.com',
        invite_token: 'invite123',
        sender_id: '00000000-0000-0000-0000-000000000000'
      }
    };

    const response = await sendGraphql(graphqlClient, addJobMutation, {
      input: jobInput
    });

    expect(response.status).toBe(200);
    expect(response.body?.errors).toBeUndefined();

    const jobId = response.body?.data?.addJob?.job?.id;

    expect(jobId).toBeTruthy();

    await waitForJobCompletion(graphqlClient, jobId);
  });
});
