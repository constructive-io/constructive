import { S3StorageProvider, streamContentType } from '@constructive-io/s3-streamer';
import uploadNames from '@constructive-io/upload-names';
import { ReadStream } from 'fs';
import type { GraphQLResolveInfo } from 'graphql';
import type { BucketProvider } from '@pgpmjs/types';

interface UploaderOptions {
  bucketName: string;
  awsRegion: string;
  awsSecretKey: string;
  awsAccessKey: string;
  minioEndpoint?: string;
  provider?: BucketProvider;
}

interface Upload {
  createReadStream: () => NodeJS.ReadableStream;
  filename: string;
  mimetype: string;
  encoding: string;
}

interface UploadPluginInfo {
  tags: { [key: string]: any };
  type: string;
}

export class UploadHandler {
  private storage: S3StorageProvider;
  private bucketName: string;

  constructor(private options: UploaderOptions) {
    this.bucketName = options.bucketName;
    this.storage = new S3StorageProvider({
      bucket: options.bucketName,
      awsRegion: options.awsRegion,
      awsSecretKey: options.awsSecretKey,
      awsAccessKey: options.awsAccessKey,
      minioEndpoint: options.minioEndpoint,
      provider: options.provider,
    });
  }

  async handleUpload(
    upload: Upload,
    _args: any,
    _context: any,
    info: GraphQLResolveInfo & { uploadPlugin: UploadPluginInfo }
  ): Promise<any> {
    const {
      uploadPlugin: { tags, type }
    } = info;

    const readStream = upload.createReadStream() as ReadStream;
    const { filename } = upload;

    const rand =
      Math.random().toString(36).substring(2, 7) +
      Math.random().toString(36).substring(2, 7);
    const key = rand + '-' + uploadNames(filename);

    const detected = await streamContentType({ readStream, filename });
    const { contentType } = detected;

    const typ = type || tags.type;

    const mim = tags.mime
      ? tags.mime.trim().split(',').map((a: string) => a.trim())
      : typ === 'image'
        ? ['image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml']
        : [];

    if (mim.length && !mim.includes(contentType)) {
      detected.stream.destroy();
      throw new Error(`UPLOAD_MIMETYPE ${mim.join(',')}`);
    }

    await this.storage.upload(key, detected.stream, { contentType });
    const url = await this.storage.presignGet(key, 3600);

    switch (typ) {
    case 'image':
    case 'upload':
      return {
        filename,
        mime: contentType,
        url
      };
    case 'attachment':
    default:
      return url;
    }
  }
}
