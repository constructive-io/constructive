import { S3StorageProvider } from '@constructive-io/s3-streamer';
import { Client as PgClient } from 'pg';
import { Readable } from 'stream';

jest.setTimeout(60000);

const SCHEMA = 'object_store_public';
const TABLE = 'files';
const BUCKET = 'test-bucket';
const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6xM4cAAAAASUVORK5CYII=',
  'base64',
);

type UploadResolverModule = typeof import('../src/upload-resolver');

function makePg(): PgClient {
  return new PgClient({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'constructive',
  });
}

function makeStorage(): S3StorageProvider {
  return new S3StorageProvider({
    bucket: BUCKET,
    awsRegion: 'us-east-1',
    awsAccessKey: 'minioadmin',
    awsSecretKey: 'minioadmin',
    minioEndpoint: 'http://localhost:9000',
    provider: 'minio',
  });
}

async function setupObjectStoreSchema(pg: PgClient): Promise<void> {
  await pg.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pg.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await pg.query(`
    DO $$ BEGIN
      CREATE TYPE ${SCHEMA}.file_status AS ENUM (
        'pending', 'processing', 'ready', 'error', 'deleting'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await pg.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.${TABLE} (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      database_id integer NOT NULL,
      bucket_key text NOT NULL DEFAULT 'default',
      key text NOT NULL,
      status ${SCHEMA}.file_status NOT NULL DEFAULT 'pending',
      status_reason text,
      etag text,
      source_table text,
      source_column text,
      source_id uuid,
      processing_started_at timestamptz,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT graphile_settings_object_store_files_pkey PRIMARY KEY (id, database_id)
    )
  `);
}

async function cleanupObjectStoreRows(pg: PgClient): Promise<void> {
  await pg.query(`DELETE FROM ${SCHEMA}.${TABLE}`);
}

async function objectExists(storage: S3StorageProvider, key: string): Promise<boolean> {
  try {
    await storage.head(key);
    return true;
  } catch {
    return false;
  }
}

async function loadUploadResolverModule(): Promise<UploadResolverModule> {
  jest.resetModules();
  return import('../src/upload-resolver');
}

function makeUpload(filename: string, body: Buffer) {
  return {
    filename,
    createReadStream: () => Readable.from(body),
  };
}

describe('upload-resolver e2e', () => {
  let pg: PgClient;
  let storage: S3StorageProvider;
  let uploadResolverModule: UploadResolverModule | null = null;
  const originalEnv = { ...process.env };
  const uploadedKeys = new Set<string>();

  beforeAll(async () => {
    process.env.UPLOAD_V2_ENABLED = 'true';
    process.env.BUCKET_PROVIDER = 'minio';
    process.env.BUCKET_NAME = BUCKET;
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY = 'minioadmin';
    process.env.AWS_SECRET_KEY = 'minioadmin';
    process.env.MINIO_ENDPOINT = 'http://localhost:9000';
    process.env.PGHOST = 'localhost';
    process.env.PGPORT = '5432';
    process.env.PGUSER = 'postgres';
    process.env.PGPASSWORD = 'password';
    process.env.PGDATABASE = 'constructive';

    pg = makePg();
    await pg.connect();
    storage = makeStorage();
    await setupObjectStoreSchema(pg);
  });

  afterEach(async () => {
    if (uploadResolverModule) {
      await uploadResolverModule.__resetUploadResolverForTests();
      uploadResolverModule = null;
    }

    for (const key of uploadedKeys) {
      try {
        await storage.delete(key);
      } catch {
        // ignore cleanup failures for already-deleted objects
      }
    }
    uploadedKeys.clear();

    await cleanupObjectStoreRows(pg);
  });

  afterAll(async () => {
    process.env = originalEnv;
    await pg.end();
    storage.destroy();
  });

  it('streams a REST upload to storage and inserts a pending files row', async () => {
    uploadResolverModule = await loadUploadResolverModule();

    const result = await uploadResolverModule.streamToStorage(
      Readable.from(MINIMAL_PNG),
      'avatar.png',
      {
        databaseId: '1',
        userId: USER_ID,
        bucketKey: 'default',
      }
    );

    expect(result.mime).toBe('image/png');
    expect(result.filename).toBe('avatar.png');
    expect(result.key).toMatch(/^1\/default\/[0-9a-f-]+_origin$/);

    uploadedKeys.add(result.key as string);
    expect(await objectExists(storage, result.key as string)).toBe(true);

    const dbResult = await pg.query(
      `SELECT database_id, bucket_key, key, status, created_by, etag
         FROM ${SCHEMA}.${TABLE}
        WHERE key = $1`,
      [result.key]
    );

    expect(dbResult.rowCount).toBe(1);
    expect(dbResult.rows[0]).toEqual(
      expect.objectContaining({
        database_id: 1,
        bucket_key: 'default',
        key: result.key,
        status: 'pending',
        created_by: USER_ID,
      })
    );
    expect(dbResult.rows[0].etag).toEqual(expect.any(String));
    expect(dbResult.rows[0].etag.length).toBeGreaterThan(0);
  });

  it('handles inline image uploads and inserts the same pending files row shape', async () => {
    uploadResolverModule = await loadUploadResolverModule();

    const imageUploadDefinition = uploadResolverModule.constructiveUploadFieldDefinitions.find(
      (definition) => 'name' in definition && definition.name === 'image'
    );

    if (!imageUploadDefinition) {
      throw new Error('Missing image upload definition');
    }

    const result = await imageUploadDefinition.resolve(
      makeUpload('inline.png', MINIMAL_PNG) as any,
      {},
      {
        req: {
          api: { databaseId: '1' },
          token: { user_id: USER_ID },
        },
      },
      { uploadPlugin: { tags: {}, type: 'image' } } as any
    );

    expect(result).toEqual(
      expect.objectContaining({
        filename: 'inline.png',
        mime: 'image/png',
        key: expect.stringMatching(/^1\/default\/[0-9a-f-]+_origin$/),
        url: expect.any(String),
      })
    );

    const key = (result as { key: string }).key;
    uploadedKeys.add(key);
    expect(await objectExists(storage, key)).toBe(true);

    const dbResult = await pg.query(
      `SELECT database_id, bucket_key, key, status, created_by
         FROM ${SCHEMA}.${TABLE}
        WHERE key = $1`,
      [key]
    );

    expect(dbResult.rowCount).toBe(1);
    expect(dbResult.rows[0]).toEqual({
      database_id: 1,
      bucket_key: 'default',
      key,
      status: 'pending',
      created_by: USER_ID,
    });
  });
});
