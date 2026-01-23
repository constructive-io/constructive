import { dirname, join } from 'path';
import type { Server as HttpServer } from 'http';
import supertest from 'supertest';
import { Server as GraphQLServer } from '@constructive-io/graphql-server';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { createJobApp } from '@constructive-io/knative-job-fn';

import { PgpmInit, PgpmMigrate } from '@pgpmjs/core';
import { getConnections, seed, type PgTestClient } from 'pgsql-test';

import type { KnativeJobsSvc as KnativeJobsSvcType } from '../src';
import type { KnativeJobsSvcOptions, FunctionServiceConfig } from '../src/types';

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
      maxAttempts
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

type JobDetails = {
  lastError?: string | null;
  attempts?: number | null;
  maxAttempts?: number | null;
};

const getJobById = async (
  client: GraphqlClient,
  jobId: string | number
) => {
  const response = await sendGraphql(client, jobByIdQuery, {
    id: String(jobId)
  });
  const data = unwrapGraphqlData<{ job: JobDetails | null }>(
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

const waitForJobFailure = async (
  client: GraphqlClient,
  jobId: string | number,
  {
    minAttempts = 1,
    timeoutMs = 30000
  }: { minAttempts?: number; timeoutMs?: number } = {}
) => {
  const started = Date.now();
  let lastJob: JobDetails | null = null;

  while (Date.now() - started < timeoutMs) {
    const job = await getJobById(client, jobId);

    if (!job) {
      throw new Error(`Job ${jobId} disappeared before failure was observed`);
    }

    lastJob = job;
    const attempts = job.attempts ?? 0;

    if (job.lastError && attempts >= minAttempts) {
      return job;
    }

    await delay(250);
  }

  throw new Error(
    `Job ${jobId} did not fail after ${minAttempts} attempt(s) within ${timeoutMs}ms (attempts=${
      lastJob?.attempts ?? 'unknown'
    }, maxAttempts=${lastJob?.maxAttempts ?? 'unknown'}, lastError=${
      lastJob?.lastError ?? 'null'
    })`
  );
};

const closeHttpServer = async (server?: HttpServer | null): Promise<void> => {
  if (!server || !server.listening) return;
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((err) => {
      if (err) {
        rejectClose(err);
        return;
      }
      resolveClose();
    });
  });
};

type MailgunFailurePayload = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

const createMailgunFailureApp = () => {
  const { send: sendPostmaster } = require('@constructive-io/postmaster');
  const app = createJobApp();

  app.post('/', async (req: any, res: any, next: any) => {
    try {
      const payload = (req.body || {}) as MailgunFailurePayload;
      const to = payload.to ?? 'user@example.com';
      const subject = payload.subject ?? 'Mailgun failure test';
      const html = payload.html ?? '<p>mailgun failure</p>';
      const from = payload.from ?? process.env.MAILGUN_FROM;
      const replyTo = payload.replyTo ?? process.env.MAILGUN_REPLY;

      await sendPostmaster({
        to,
        subject,
        ...(html && { html }),
        ...(payload.text && { text: payload.text }),
        ...(from && { from }),
        ...(replyTo && { replyTo })
      });

      res.status(200).json({ complete: true });
    } catch (err) {
      next(err);
    }
  });

  return app;
};

const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';
const metaDbExtensions = ['citext', 'uuid-ossp', 'unaccent', 'pgcrypto', 'hstore'];
// Ports are fixed by test design, if these're occupied, then the test just feel free to fail.
const GRAPHQL_PORT = 3000;
const CALLBACK_PORT = 12345;
const SIMPLE_EMAIL_PORT = 8081;
const SEND_EMAIL_LINK_PORT = 8082;
const MAILGUN_FAILURE_PORT = 8083;

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
  let graphqlServer: GraphQLServer | null = null;
  let databaseId = '';
  let pg: PgTestClient | undefined;
  let knativeJobsSvc: KnativeJobsSvcType | null = null;
  let mailgunServer: HttpServer | null = null;
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
    INTERNAL_JOBS_CALLBACK_URL: process.env.INTERNAL_JOBS_CALLBACK_URL,
    FEATURES_POSTGIS: process.env.FEATURES_POSTGIS
  };

  beforeAll(async () => {
    delete process.env.TEST_DB;
    delete process.env.PGDATABASE;

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

    process.env.NODE_ENV = 'test';
    process.env.PGDATABASE = pg.config.database;
    process.env.TEST_DATABASE_ID = databaseId;
    process.env.DEFAULT_DATABASE_ID = databaseId;
    process.env.TEST_GRAPHQL_URL = graphqlUrl;
    process.env.GRAPHQL_URL = graphqlUrl;
    process.env.META_GRAPHQL_URL = graphqlUrl;
    process.env.SIMPLE_EMAIL_DRY_RUN = 'true';
    process.env.SEND_EMAIL_LINK_DRY_RUN = 'true';
    process.env.LOCAL_APP_PORT = String(GRAPHQL_PORT);
    process.env.MAILGUN_DOMAIN = 'mg.constructive.io';
    process.env.MAILGUN_FROM = 'no-reply@mg.constructive.io';
    process.env.MAILGUN_REPLY = 'info@mg.constructive.io';
    process.env.MAILGUN_API_KEY = 'change-me-mailgun-api-key';
    process.env.MAILGUN_KEY = 'change-me-mailgun-api-key';
    process.env.JOBS_SUPPORT_ANY = 'false';
    process.env.JOBS_SUPPORTED = 'simple-email,send-email-link,mailgun-failure';
    process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP = JSON.stringify({
      'simple-email': `http://127.0.0.1:${SIMPLE_EMAIL_PORT}`,
      'send-email-link': `http://127.0.0.1:${SEND_EMAIL_LINK_PORT}`,
      'mailgun-failure': `http://127.0.0.1:${MAILGUN_FAILURE_PORT}`
    });
    process.env.INTERNAL_JOBS_CALLBACK_PORT = String(CALLBACK_PORT);
    process.env.INTERNAL_JOBS_CALLBACK_URL = callbackUrl;
    process.env.FEATURES_POSTGIS = 'false';

    if (pg.config.host) process.env.PGHOST = pg.config.host;
    if (pg.config.port) process.env.PGPORT = String(pg.config.port);
    if (pg.config.user) process.env.PGUSER = pg.config.user;
    if (pg.config.password) process.env.PGPASSWORD = pg.config.password;

    const services: FunctionServiceConfig[] = [
      { name: 'simple-email', port: SIMPLE_EMAIL_PORT },
      { name: 'send-email-link', port: SEND_EMAIL_LINK_PORT }
    ];

    const graphqlOptions: ConstructiveOptions = {
      pg: {
        host: pg.config.host,
        port: pg.config.port,
        user: pg.config.user,
        password: pg.config.password,
        database: pg.config.database
      },
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
    };

    graphqlServer = new GraphQLServer(graphqlOptions);
    graphqlServer.addEventListener();
    const graphqlHttpServer = graphqlServer.listen();
    if (!graphqlHttpServer.listening) {
      await new Promise<void>((resolveListen) => {
        graphqlHttpServer.once('listening', () => resolveListen());
      });
    }

    const knativeJobsSvcOptions: KnativeJobsSvcOptions = {
      functions: {
        enabled: true,
        services
      },
      jobs: { enabled: true }
    };

    const { KnativeJobsSvc } = await import('../src');
    knativeJobsSvc = new KnativeJobsSvc(knativeJobsSvcOptions);
    await knativeJobsSvc.start();

    graphqlClient = getGraphqlClient();

    const mailgunApp = createMailgunFailureApp();
    mailgunServer = await new Promise<HttpServer>((resolve, reject) => {
      const server = mailgunApp.listen(MAILGUN_FAILURE_PORT, () => resolve(server));
      server.on('error', reject);
    });
  });

  afterAll(async () => {
    if (knativeJobsSvc) {
      await knativeJobsSvc.stop();
    }
    if (graphqlServer) {
      await graphqlServer.close({ closeCaches: true });
      graphqlServer = null;
    }
    await closeHttpServer(mailgunServer);
    mailgunServer = null;
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

  it('creates and processes a send-email-link forgot_password job', async () => {
    const jobInput = {
      dbId: databaseId,
      identifier: 'send-email-link',
      payload: {
        email_type: 'forgot_password',
        email: 'user@example.com',
        user_id: '00000000-0000-0000-0000-000000000000',
        reset_token: 'reset-token-123'
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

  it('creates and processes a send-email-link email_verification job', async () => {
    const jobInput = {
      dbId: databaseId,
      identifier: 'send-email-link',
      payload: {
        email_type: 'email_verification',
        email: 'user@example.com',
        email_id: '55555555-5555-5555-5555-555555555555',
        verification_token: 'verify-token-123'
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

  it('fails send-email-link job when required fields are missing', async () => {
    const jobInput = {
      dbId: databaseId,
      identifier: 'send-email-link',
      maxAttempts: 1,
      payload: {
        email_type: 'forgot_password',
        email: 'user@example.com'
        // Missing: user_id, reset_token
      }
    };

    const response = await sendGraphql(graphqlClient, addJobMutation, {
      input: jobInput
    });

    expect(response.status).toBe(200);
    expect(response.body?.errors).toBeUndefined();

    const jobId = response.body?.data?.addJob?.job?.id;

    expect(jobId).toBeTruthy();

    const job = await waitForJobFailure(graphqlClient, jobId, {
      minAttempts: 1,
      timeoutMs: 30000
    });

    expect(job.attempts).toBe(1);
    expect(job.maxAttempts).toBe(1);
    expect(job.lastError).toBeTruthy();
  });

  it('records failed jobs when a function throws', async () => {
    const jobInput = {
      dbId: databaseId,
      identifier: 'simple-email',
      maxAttempts: 1,
      payload: {
        to: 'user@example.com',
        html: '<p>missing subject</p>'
      }
    };

    const response = await sendGraphql(graphqlClient, addJobMutation, {
      input: jobInput
    });

    expect(response.status).toBe(200);
    expect(response.body?.errors).toBeUndefined();

    const jobId = response.body?.data?.addJob?.job?.id;

    expect(jobId).toBeTruthy();

    const job = await waitForJobFailure(graphqlClient, jobId, {
      minAttempts: 1,
      timeoutMs: 30000
    });

    expect(job.attempts).toBe(1);
    expect(job.maxAttempts).toBe(1);
    expect(job.lastError).toContain('Missing required field');
  });

  it('retries failed jobs until max attempts is reached', async () => {
    const jobInput = {
      dbId: databaseId,
      identifier: 'simple-email',
      maxAttempts: 2,
      payload: {
        to: 'user@example.com',
        html: '<p>missing subject</p>'
      }
    };

    const response = await sendGraphql(graphqlClient, addJobMutation, {
      input: jobInput
    });

    expect(response.status).toBe(200);
    expect(response.body?.errors).toBeUndefined();

    const jobId = response.body?.data?.addJob?.job?.id;

    expect(jobId).toBeTruthy();

    const firstFailure = await waitForJobFailure(graphqlClient, jobId, {
      minAttempts: 1,
      timeoutMs: 30000
    });

    expect(firstFailure.attempts).toBe(1);

    const retried = await waitForJobFailure(graphqlClient, jobId, {
      minAttempts: 2,
      timeoutMs: 60000
    });

    expect(retried.attempts).toBe(2);
    expect(retried.maxAttempts).toBe(2);
    expect(retried.lastError).toContain('Missing required field');
  });

  it('records mailgun failures when dry run is disabled', async () => {
    process.env.MAILGUN_API_KEY = 'invalid-mailgun-api-key';
    process.env.MAILGUN_KEY = 'invalid-mailgun-api-key';

    const jobInput = {
      dbId: databaseId,
      identifier: 'mailgun-failure',
      maxAttempts: 1,
      payload: {
        to: 'user@example.com',
        subject: 'Mailgun failure test',
        html: '<p>mailgun should reject this</p>'
      }
    };

    const response = await sendGraphql(graphqlClient, addJobMutation, {
      input: jobInput
    });

    expect(response.status).toBe(200);
    expect(response.body?.errors).toBeUndefined();

    const jobId = response.body?.data?.addJob?.job?.id;

    expect(jobId).toBeTruthy();

    const job = await waitForJobFailure(graphqlClient, jobId, {
      minAttempts: 1,
      timeoutMs: 60000
    });

    expect(job.attempts).toBe(1);
    expect(job.maxAttempts).toBe(1);
    expect(job.lastError).toBeTruthy();
  });
});
