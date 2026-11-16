import { buildFileProjection } from '../src/file-projection';
import type { S3Config } from '../src/types';

const BUCKET_ID = '33333333-3333-3333-3333-333333333333';
const FILE_ID = '44444444-4444-4444-4444-444444444444';

describe('buildFileProjection', () => {
  it('names the files row in `id` so a document reference is countable', () => {
    const projection = buildFileProjection(
      { id: FILE_ID, key: 'abc123', bucketId: BUCKET_ID, mime: 'image/png', size: 42, filename: 'hero.png' },
      { is_public: true },
      { publicUrlPrefix: 'https://cdn.example.com/', bucket: 'physical-bucket' } as S3Config,
    );

    expect(projection).toEqual({
      id: FILE_ID,
      key: 'abc123',
      bucket_id: BUCKET_ID,
      mime: 'image/png',
      size: 42,
      filename: 'hero.png',
      url: 'https://cdn.example.com/physical-bucket/abc123',
    });
  });

  it.each([
    ['http://localhost:9000', 'database-public-a', 'abc123', 'http://localhost:9000/database-public-a/abc123'],
    ['http://localhost:9000/', 'database-public-b', 'abc123', 'http://localhost:9000/database-public-b/abc123'],
    ['https://cdn.example.com/storage///', 'physical-bucket', 'images/hero.png', 'https://cdn.example.com/storage/physical-bucket/images/hero.png'],
  ])('addresses the physical bucket under %s', (publicUrlPrefix, bucket, key, expected) => {
    const projection = buildFileProjection(
      { id: FILE_ID, key, bucketId: BUCKET_ID, mime: 'image/png', size: 42 },
      { is_public: true },
      { publicUrlPrefix, bucket } as S3Config,
    );

    // bucket_id is the database FK; the URL must address the resolved S3 bucket.
    expect(projection.bucket_id).toBe(BUCKET_ID);
    expect(projection.url).toBe(expected);
  });

  it('omits a public URL when the storage plane has no public prefix', () => {
    const projection = buildFileProjection(
      { id: FILE_ID, key: 'abc123', bucketId: BUCKET_ID, mime: 'image/png', size: 42 },
      { is_public: true },
      { bucket: 'physical-bucket' } as S3Config,
    );

    expect(projection.url).toBeUndefined();
  });

  it('omits `url` for a private bucket rather than storing an expiring one', () => {
    const projection = buildFileProjection(
      { id: FILE_ID, key: 'abc123', bucketId: BUCKET_ID, mime: 'image/png', size: 42 },
      { is_public: false },
      { publicUrlPrefix: 'https://cdn.example.com' } as S3Config,
    );

    expect(projection.url).toBeUndefined();
    expect(projection.id).toBe(FILE_ID);
  });
});
