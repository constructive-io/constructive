import { buildFileProjection } from '../src/file-projection';
import type { S3Config } from '../src/types';

const BUCKET_ID = '33333333-3333-3333-3333-333333333333';
const FILE_ID = '44444444-4444-4444-4444-444444444444';

describe('buildFileProjection', () => {
  it('names the files row in `id` so a document reference is countable', () => {
    const projection = buildFileProjection(
      { id: FILE_ID, key: 'abc123', bucketId: BUCKET_ID, mime: 'image/png', size: 42, filename: 'hero.png' },
      { is_public: true },
      { publicUrlPrefix: 'https://cdn.example.com/' } as S3Config,
    );

    expect(projection).toEqual({
      id: FILE_ID,
      key: 'abc123',
      bucket_id: BUCKET_ID,
      mime: 'image/png',
      size: 42,
      filename: 'hero.png',
      url: 'https://cdn.example.com/abc123',
    });
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
