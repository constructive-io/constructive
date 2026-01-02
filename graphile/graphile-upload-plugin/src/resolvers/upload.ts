import streamer from '@constructive-io/s3-streamer';
import uploadNames from '@constructive-io/upload-names';
import type { BucketProvider } from '@pgpmjs/types';

export interface UploaderOptions {
  bucketName: string;
  awsRegion: string;
  awsSecretKey: string;
  awsAccessKey: string;
  minioEndpoint?: string;
  provider?: BucketProvider;
}

export class Uploader {
  private streamerInstance: any;

  constructor(private opts: UploaderOptions) {
    const {
      bucketName,
      awsRegion,
      awsSecretKey,
      awsAccessKey,
      minioEndpoint,
      provider
    } = this.opts;

    this.streamerInstance = new streamer({
      defaultBucket: bucketName,
      awsRegion,
      awsSecretKey,
      awsAccessKey,
      minioEndpoint,
      provider,
    });
  }

  async resolveUpload(upload: any, _args: any, _context: any, info: any) {
    const {
      uploadPlugin: { tags, type }
    } = info;

    const readStream = upload.createReadStream();
    const { filename } = upload;

    const rand =
      Math.random().toString(36).substring(2, 7) +
      Math.random().toString(36).substring(2, 7);

    const key = `${rand}-${uploadNames(filename)}`;
    const result = await this.streamerInstance.upload({
      readStream,
      filename,
      key,
      bucket: this.opts.bucketName
    });

    const url = result.upload.Location;
    const {
      contentType,
      magic: { charset }
    } = result;

    const typ = type || tags.type;

    const allowedMimes = tags.mime
      ? tags.mime.trim().split(',').map((a: string) => a.trim())
      : typ === 'image'
        ? ['image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml']
        : [];

    if (allowedMimes.length && !allowedMimes.includes(contentType)) {
      throw new Error(`UPLOAD_MIMETYPE ${allowedMimes.join(',')}`);
    }

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
