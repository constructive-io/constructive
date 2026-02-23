import { S3Client } from '@aws-sdk/client-s3';
import { streamContentType } from '@constructive-io/content-type-stream';
import type { BucketProvider } from '@pgpmjs/types';
import type { Readable } from 'stream';

import getS3 from './s3';
import {
  type AsyncUploadResult,
  upload as streamUpload,
  uploadWithContentType as streamUploadWithContentType,
} from './utils';

interface StreamerOptions {
  awsRegion: string;
  awsSecretKey: string;
  awsAccessKey: string;
  minioEndpoint?: string;
  provider?: BucketProvider;
  defaultBucket: string;
}

interface UploadParams {
  readStream: Readable;
  filename: string;
  key: string;
  bucket?: string;
}

interface UploadWithContentTypeParams {
  readStream: Readable;
  contentType: string;
  key: string;
  bucket?: string;
  magic?: { charset: string; type?: string };
}

export class Streamer {
  private s3: S3Client;
  private defaultBucket?: string;

  constructor({
    awsRegion,
    awsSecretKey,
    awsAccessKey,
    minioEndpoint,
    provider,
    defaultBucket
  }: StreamerOptions) {
    this.s3 = getS3({
      awsRegion,
      awsSecretKey,
      awsAccessKey,
      minioEndpoint,
      provider
    });
    this.defaultBucket = defaultBucket;
  }

  async upload({
    readStream,
    filename,
    key,
    bucket = this.defaultBucket
  }: UploadParams): Promise<AsyncUploadResult> {
    if (!bucket) {
      throw new Error('Bucket is required');
    }
    
    return await streamUpload({
      client: this.s3,
      readStream,
      filename,
      key,
      bucket
    });
  }

  async uploadWithContentType({
    readStream,
    contentType,
    key,
    bucket = this.defaultBucket,
    magic,
  }: UploadWithContentTypeParams): Promise<AsyncUploadResult> {
    if (!bucket) {
      throw new Error('Bucket is required');
    }

    return await streamUploadWithContentType({
      client: this.s3,
      readStream,
      contentType,
      key,
      bucket,
      magic,
    });
  }

  async detectContentType({
    readStream,
    filename,
    peekBytes,
  }: {
    readStream: Readable;
    filename: string;
    peekBytes?: number;
  }): ReturnType<typeof streamContentType> {
    return streamContentType({ readStream, filename, peekBytes });
  }

  destroy(): void {
    this.s3.destroy();
  }
}

export default Streamer;
