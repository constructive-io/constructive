import { Readable } from 'stream';

interface MockUploadResult {
  upload: { Location: string };
  contentType: string;
}

async function loadUploadResolverModule(opts: {
  detectedContentType: string;
  uploadResultContentType?: string;
}) {
  jest.resetModules();

  const mockDetectContentType = jest.fn().mockResolvedValue({
    stream: Readable.from([Buffer.alloc(16)]),
    magic: { type: opts.detectedContentType, charset: 'binary' },
    contentType: opts.detectedContentType,
  });

  const mockUploadWithContentType = jest.fn().mockResolvedValue({
    upload: { Location: 'https://cdn.example.com/uploaded-file' },
    contentType: opts.uploadResultContentType ?? opts.detectedContentType,
  } as MockUploadResult);

  const mockUpload = jest.fn().mockResolvedValue({
    upload: { Location: 'https://cdn.example.com/storage-upload' },
    contentType: 'application/octet-stream',
  } as MockUploadResult);

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

  jest.doMock('@constructive-io/s3-streamer', () => {
    const StreamerMock = jest.fn().mockImplementation(() => ({
      upload: mockUpload,
      uploadWithContentType: mockUploadWithContentType,
      detectContentType: mockDetectContentType,
    }));
    return {
      __esModule: true,
      default: StreamerMock,
    };
  });

  const mod = await import('../src/upload-resolver');

  return {
    ...mod,
    mockDetectContentType,
    mockUploadWithContentType,
    mockUpload,
  };
}

function makeFakeUpload(filename: string) {
  return {
    filename,
    createReadStream: jest.fn(() => Readable.from([Buffer.alloc(16)])),
  };
}

describe('uploadResolver MIME validation', () => {
  it('rejects disallowed MIME before uploading to storage', async () => {
    const {
      constructiveUploadFieldDefinitions,
      mockDetectContentType,
      mockUploadWithContentType,
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
        {},
        { uploadPlugin: { tags: {}, type: 'image' } },
      ),
    ).rejects.toThrow('UPLOAD_MIMETYPE');

    expect(mockDetectContentType).toHaveBeenCalledTimes(1);
    expect(mockUploadWithContentType).not.toHaveBeenCalled();
  });

  it('uploads and returns image metadata when MIME is allowed', async () => {
    const {
      constructiveUploadFieldDefinitions,
      mockDetectContentType,
      mockUploadWithContentType,
    } = await loadUploadResolverModule({
      detectedContentType: 'image/png',
      uploadResultContentType: 'image/png',
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
      {},
      { uploadPlugin: { tags: {}, type: 'image' } },
    );

    expect(result).toEqual({
      filename: 'photo.png',
      mime: 'image/png',
      url: 'https://cdn.example.com/uploaded-file',
    });
    expect(mockDetectContentType).toHaveBeenCalledTimes(1);
    expect(mockUploadWithContentType).toHaveBeenCalledTimes(1);
    expect(mockUploadWithContentType).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/png',
      }),
    );
  });
});
