/**
 * Tests for the explicit bucket reconciliation enqueue mutation.
 */

let capturedLambdaCallback: Function | null = null;

jest.mock('grafast', () => ({
  context: jest.fn(() => ({
    get: jest.fn((key: string) => `mock-${key}`),
  })),
  lambda: jest.fn((_combined: any, callback: any) => {
    capturedLambdaCallback = callback;
    return 'lambda-step';
  }),
  object: jest.fn((obj: any) => obj),
}));

const mockGetRaw = jest.fn(() => 'mock-input');
jest.mock('graphile-utils', () => ({
  extendSchema: jest.fn((factory: any) => {
    const schema = factory();
    if (schema.plans?.Mutation?.provisionBucket) {
      schema.plans.Mutation.provisionBucket(null, { getRaw: mockGetRaw });
    }
    return {
      name: 'ExtendSchemaPlugin',
      schema: { hooks: {} },
      _typeDefs: schema.typeDefs,
      _plans: schema.plans,
    };
  }),
  gql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

import { createBucketProvisionerPlugin } from '../src/plugin';

const DATABASE_ID = 'db-uuid-123';
const BUCKET_ID = 'bucket-uuid-789';
const JOB_ID = 'job-uuid-999';

function createMockPgClient(scope: string, physicalName: string | null = null) {
  const query = jest.fn((arg: any) => {
    const sql: string = typeof arg === 'string' ? arg : arg.text;
    if (sql.includes('jwt_private.current_database_id')) {
      return Promise.resolve({ rows: [{ id: DATABASE_ID }] });
    }
    if (sql.includes('metaschema_modules_public.storage_module')) {
      return Promise.resolve({
        rows: [{
          id: 'sm-uuid-456',
          scope,
          entity_table_id: null,
          buckets_schema: 'app_public',
          buckets_table: 'buckets',
          endpoint: null,
          public_url_prefix: null,
          provider: null,
          allowed_origins: null,
          entity_schema: null,
          entity_table: null,
        }],
      });
    }
    if (sql.includes('FROM app_public.buckets')) {
      return Promise.resolve({
        rows: [{
          id: BUCKET_ID,
          key: 'public',
          physical_name: physicalName,
        }],
      });
    }
    if (sql.includes('app_jobs.add_job')) {
      return Promise.resolve({ rows: [{ id: JOB_ID }] });
    }
    throw new Error(`unexpected query: ${sql}`);
  });
  return { query };
}

async function invoke(pgClient: any, input = { bucketKey: 'public' }) {
  const withPgClient = jest.fn((_settings: any, callback: any) => callback(pgClient));
  return capturedLambdaCallback!({
    input,
    withPgClient,
    pgSettings: { role: 'admin' },
  });
}

describe('createBucketProvisionerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedLambdaCallback = null;
  });

  it('returns a mutation-only plugin', () => {
    const plugin = createBucketProvisionerPlugin({});

    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('ExtendSchemaPlugin');
    expect(plugin.schema).toBeDefined();
  });

  it('enqueues the exact database-scope reconciliation job and returns its id', async () => {
    createBucketProvisionerPlugin({});
    const pgClient = createMockPgClient('database');

    const result = await invoke(pgClient);
    const enqueue = pgClient.query.mock.calls.find((call: any[]) =>
      call[0]?.text?.includes('app_jobs.add_job'));

    expect(enqueue).toBeDefined();
    expect(enqueue[0].text).toContain("identifier => 'storage:provision_bucket'");
    expect(enqueue[0].text).toContain("queue_name => 'bucket:' || $1::text");
    expect(enqueue[0].text).toContain('max_attempts => 25');
    expect(enqueue[0].text).toContain('priority => 0');
    expect(enqueue[0].text).toContain('db_id => $2');
    expect(enqueue[0].text).toContain("entity_type => 'database'");
    expect(enqueue[0].text).toContain("'database_id', $2::uuid");
    expect(enqueue[0].text).toContain("'id', $1::uuid");
    expect(enqueue[0].values).toEqual([BUCKET_ID, DATABASE_ID]);
    expect(result).toEqual({
      bucketId: BUCKET_ID,
      bucketKey: 'public',
      physicalName: null,
      jobId: JOB_ID,
    });
  });

  it('enqueues the exact platform-scope reconciliation job', async () => {
    createBucketProvisionerPlugin({});
    const pgClient = createMockPgClient('platform', 'existing-physical-name');

    const result = await invoke(pgClient);
    const enqueue = pgClient.query.mock.calls.find((call: any[]) =>
      call[0]?.text?.includes('app_jobs.add_job'));

    expect(enqueue).toBeDefined();
    expect(enqueue[0].text).not.toContain('db_id =>');
    expect(enqueue[0].text).not.toContain('entity_type =>');
    expect(enqueue[0].text).toContain("'id', $1::uuid");
    expect(enqueue[0].values).toEqual([BUCKET_ID]);
    expect(result).toEqual({
      bucketId: BUCKET_ID,
      bucketKey: 'public',
      physicalName: 'existing-physical-name',
      jobId: JOB_ID,
    });
  });

  it('propagates enqueue failures as GraphQL errors', async () => {
    createBucketProvisionerPlugin({});
    const pgClient = createMockPgClient('database');
    pgClient.query.mockImplementation((arg: any) => {
      const sql: string = typeof arg === 'string' ? arg : arg.text;
      if (sql.includes('app_jobs.add_job')) {
        return Promise.reject(new Error('enqueue failed'));
      }
      return createMockPgClient('database').query(arg);
    });

    await expect(invoke(pgClient)).rejects.toThrow('enqueue failed');
  });

  it('throws for invalid and missing bucket inputs', async () => {
    createBucketProvisionerPlugin({});

    await expect(invoke({ query: jest.fn() }, { bucketKey: '' }))
      .rejects.toThrow('INVALID_BUCKET_KEY');

    const pgClient = createMockPgClient('database');
    pgClient.query.mockImplementation((arg: any) => {
      const sql: string = typeof arg === 'string' ? arg : arg.text;
      if (sql.includes('FROM app_public.buckets')) return Promise.resolve({ rows: [] });
      return createMockPgClient('database').query(arg);
    });
    await expect(invoke(pgClient)).rejects.toThrow('BUCKET_NOT_FOUND');
  });
});
