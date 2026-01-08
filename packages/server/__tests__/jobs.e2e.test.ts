import supertest from 'supertest';

import { getConnections } from '@constructive-io/graphql-test';

jest.setTimeout(120000);

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type GraphqlClient = {
  http: ReturnType<typeof supertest>;
  path: string;
  host?: string;
};

const getGraphqlClient = (): GraphqlClient => {
  const rawUrl =
    process.env.TEST_GRAPHQL_URL ||
    process.env.GRAPHQL_URL ||
    'http://localhost:3000/graphql';
  const parsed = new URL(rawUrl);
  const origin = `${parsed.protocol}//${parsed.host}`;
  const path =
    parsed.pathname === '/' ? '/graphql' : `${parsed.pathname}${parsed.search}`;
  const host = process.env.TEST_GRAPHQL_HOST || process.env.GRAPHQL_HOST;

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

describe('jobs e2e', () => {
  let teardown: () => Promise<void>;
  let graphqlClient: GraphqlClient;
  let databaseId = '';
  let pg: { oneOrNone?: <T>(query: string, values?: unknown[]) => Promise<T | null> } | undefined;

  beforeAll(async () => {
    const targetDb = process.env.TEST_DB || process.env.PGDATABASE;
    if (!targetDb) {
      throw new Error('TEST_DB or PGDATABASE must point at the jobs database');
    }
    process.env.TEST_DB = targetDb;

    ({ teardown, pg } = await getConnections(
      {
        schemas: ['app_jobs'],
        authRole: 'administrator'
      }
    ));

    graphqlClient = getGraphqlClient();
    databaseId = process.env.TEST_DATABASE_ID ?? '';
    if (!databaseId && pg?.oneOrNone) {
      const row = await pg.oneOrNone<{ id: string }>(
        'SELECT id FROM metaschema_public.database ORDER BY created_at LIMIT 1'
      );
      databaseId = row?.id ?? '';
    }
    if (!databaseId) {
      throw new Error('TEST_DATABASE_ID is required or metaschema_public.database must contain a row');
    }
    process.env.TEST_DATABASE_ID = databaseId;
  });

  afterAll(async () => {
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
