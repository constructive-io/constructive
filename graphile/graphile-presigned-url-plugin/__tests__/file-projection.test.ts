import { buildFileProjection } from '../src/file-projection';

const BUCKET_ID = '33333333-3333-3333-3333-333333333333';
const FILE_ID = '44444444-4444-4444-4444-444444444444';

describe('buildFileProjection', () => {
  it('names the files row in `id` so a document reference is countable', () => {
    const projection = buildFileProjection(
      { id: FILE_ID, key: 'abc123', bucketId: BUCKET_ID, mime: 'image/png', size: 42, filename: 'hero.png' },
    );

    expect(projection).toEqual({
      id: FILE_ID,
      key: 'abc123',
      bucket_id: BUCKET_ID,
      mime: 'image/png',
      size: 42,
      filename: 'hero.png',
    });
  });

  it('omits the filename when none was supplied', () => {
    const projection = buildFileProjection({ id: FILE_ID, key: 'abc123', bucketId: BUCKET_ID, mime: 'image/png', size: 42 });

    expect(projection).not.toHaveProperty('filename');
  });
});
