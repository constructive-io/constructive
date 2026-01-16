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
// Ports are fixed by test design, if these're occupied, then the test just feel free to fail.
const GRAPHQL_PORT = 3000;
const CALLBACK_PORT = 12345;
const SIMPLE_EMAIL_PORT = 8081;
const SEND_EMAIL_LINK_PORT = 8082;

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



describe('jobs e2e', () => {
  let teardown: () => Promise<void>;
  let graphqlClient: GraphqlClient;
  let databaseId = '';
  let pg: PgTestClient | undefined;
  let combinedServer: CombinedServerType | null = null;

  beforeAll(async () => {
    ({ teardown, pg } = await createTestDb());
    if (!pg) {
      throw new Error('Test database connection is missing');
    }
    databaseId = seededDatabaseId;
    if (pg?.oneOrNone) {
      const row = await pg.oneOrNone<{ id: string }>(
        'SELECT id FROM metaschema_public.database WHERE id = $1',
        [databaseId]
      );
      if (!row?.id) {
        throw new Error(`Seeded database id ${databaseId} was not found`);
      }
    }

    if (!pg?.config.database) {
      throw new Error('Test database config is missing a database name');
    }

    const graphqlUrl = `http://127.0.0.1:${GRAPHQL_PORT}/graphql`;
    const callbackUrl = `http://127.0.0.1:${CALLBACK_PORT}/callback`;
    const pgConfig = {
      host: pg.config.host,
      port: pg.config.port,
      user: pg.config.user,
      password: pg.config.password,
      database: pg.config.database
    };
    const envConfig: NodeJS.ProcessEnv = { NODE_ENV: 'test' };

    const services: FunctionServiceConfig[] = [
      { name: 'simple-email', port: SIMPLE_EMAIL_PORT },
      { name: 'send-email-link', port: SEND_EMAIL_LINK_PORT }
    ];

    const combinedServerOptions: CombinedServerOptions = {
      graphql: {
        enabled: true,
        graphqlConfig: {
          pg: pgConfig,
          server: {
            host: '127.0.0.1',
            port: GRAPHQL_PORT
          },
          api: {
            enableServicesApi: false,
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
        },
        envConfig
      },
      functions: {
        enabled: true,
        services,
        functionsConfig: {
          'simple-email': { dryRun: true },
          'send-email-link': {
            dryRun: true,
            graphqlUrl,
            metaGraphqlUrl: graphqlUrl,
            defaultDatabaseId: databaseId
          }
        }
      },
      jobs: {
        enabled: true,
        pgConfig,
        jobsConfig: {
          schema: { schema: 'app_jobs' },
          worker: {
            supportAny: false,
            supported: ['simple-email', 'send-email-link']
          },
          scheduler: {
            supportAny: false,
            supported: ['simple-email', 'send-email-link']
          },
          gateway: {
            gatewayUrl: 'http://gateway:8080',
            callbackUrl,
            callbackPort: CALLBACK_PORT
          }
        },
        devMapConfig: {
          'simple-email': `http://127.0.0.1:${SIMPLE_EMAIL_PORT}`,
          'send-email-link': `http://127.0.0.1:${SEND_EMAIL_LINK_PORT}`
        },
        callbackServerConfig: { port: CALLBACK_PORT },
        envConfig
      }
    };

    const { CombinedServer } = await import('../src/server');
    combinedServer = new CombinedServer(combinedServerOptions);
    await combinedServer.start();

    graphqlClient = buildGraphqlClient(graphqlUrl);
  });

  afterAll(async () => {
    if (combinedServer) {
      await combinedServer.stop();
    }
    if (teardown) {
      await teardown();
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
