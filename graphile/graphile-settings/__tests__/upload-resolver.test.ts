import { Readable } from 'stream';

async function loadUploadResolverModule(opts: {
  detectedContentType: string;
}) {
  jest.resetModules();

  const mockStreamContentType = jest.fn().mockResolvedValue({
    stream: Readable.from([Buffer.alloc(16)]),
    magic: { type: opts.detectedContentType, charset: 'binary' },
    contentType: opts.detectedContentType,
  });

  const mockUpload = jest.fn().mockResolvedValue({ etag: 'test-etag' });
  const mockPresignGet = jest.fn().mockResolvedValue('https://cdn.example.com/signed-url');

  const MockS3StorageProvider = jest.fn().mockImplementation(() => ({
    upload: mockUpload,
    presignGet: mockPresignGet,
  }));

  const mockPoolQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  const MockPool = jest.fn().mockImplementation(() => ({
    query: mockPoolQuery,
    end: jest.fn(),
  }));

  jest.doMock('@constructive-io/graphql-env', () => ({
    getEnvOptions: jest.fn(() => ({
      cdn: {
        provider: 'minio',
        bucketName: 'test-bucket',
        awsRegion: 'us-east-1',
        awsAccessKey: 'test',
        awsSecretKey: 'test',
        minioEndpoint: 'http://localhost:9000',
      },
    })),
  }));

  jest.doMock('@constructive-io/s3-streamer', () => ({
    __esModule: true,
    S3StorageProvider: MockS3StorageProvider,
    streamContentType: mockStreamContentType,
  }));

  jest.doMock('pg', () => ({
    Pool: MockPool,
  }));

  const mod = await import('../src/upload-resolver');

  return {
    ...mod,
    mockStreamContentType,
    mockUpload,
    mockPresignGet,
    mockPoolQuery,
  };
}

function makeFakeUpload(filename: string) {
  return {
    filename,
    createReadStream: jest.fn(() => Readable.from([Buffer.alloc(16)])),
  };
}

function makeFakeContext(databaseId?: string, userId?: string) {
  return {
    req: {
      api: { databaseId },
      token: { user_id: userId },
    },
  };
}

describe('uploadResolver MIME validation', () => {
  it('rejects disallowed MIME before uploading to storage', async () => {
    const {
      constructiveUploadFieldDefinitions,
      mockStreamContentType,
      mockUpload,
    } = await loadUploadResolverModule({
      detectedContentType: 'application/pdf',
    });

    const imageDef = constructiveUploadFieldDefinitions.find(
      (def) => 'name' in def && def.name === 'image',
    );
    if (!imageDef) {
      throw new Error('Missing image upload field definition');
    }

    const fakeUpload = makeFakeUpload('document.pdf');

    await expect(
      imageDef.resolve(
        fakeUpload as any,
        {},
        makeFakeContext('1'),
        { uploadPlugin: { tags: {}, type: 'image' } },
      ),
    ).rejects.toThrow('UPLOAD_MIMETYPE');

    expect(mockStreamContentType).toHaveBeenCalledTimes(1);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads and returns image metadata when MIME is allowed', async () => {
    const {
      constructiveUploadFieldDefinitions,
      mockStreamContentType,
      mockUpload,
      mockPresignGet,
    } = await loadUploadResolverModule({
      detectedContentType: 'image/png',
    });

    const imageDef = constructiveUploadFieldDefinitions.find(
      (def) => 'name' in def && def.name === 'image',
    );
    if (!imageDef) {
      throw new Error('Missing image upload field definition');
    }

    const fakeUpload = makeFakeUpload('photo.png');

    const result = await imageDef.resolve(
      fakeUpload as any,
      {},
      makeFakeContext('1', 'user-123'),
      { uploadPlugin: { tags: {}, type: 'image' } },
    );

    expect(result).toEqual(
      expect.objectContaining({
        filename: 'photo.png',
        mime: 'image/png',
        url: 'https://cdn.example.com/signed-url',
        key: expect.stringMatching(/^1\/default\/[0-9a-f-]+_origin$/),
      }),
    );
    expect(mockStreamContentType).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockPresignGet).toHaveBeenCalledTimes(1);
  });

  it('throws when databaseId is missing', async () => {
    const { constructiveUploadFieldDefinitions } = await loadUploadResolverModule({
      detectedContentType: 'image/png',
    });

    const imageDef = constructiveUploadFieldDefinitions.find(
      (def) => 'name' in def && def.name === 'image',
    );
    if (!imageDef) {
      throw new Error('Missing image upload field definition');
    }

    const fakeUpload = makeFakeUpload('photo.png');

    await expect(
      imageDef.resolve(
        fakeUpload as any,
        {},
        {}, // no databaseId
        { uploadPlugin: { tags: {}, type: 'image' } },
      ),
    ).rejects.toThrow('databaseId is required');
  });
});
