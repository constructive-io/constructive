/**
 * StorageProvider interface and S3 implementation.
 *
 * The StorageProvider interface abstracts storage operations so that
 * future implementations (GCS, Azure, local filesystem) can be swapped
 * in without changing consumers.
 *
 * S3StorageProvider is the only implementation for now. It is
 * MinIO-compatible (forcePathStyle: true, configurable endpoint).
 */

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'stream';

import getS3 from './s3';

// -- Interfaces --

export interface UploadOpts {
  contentType: string;
  size?: number;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  etag: string;
  versionId?: string;
}

export interface ObjectMeta {
  key: string;
  size: number;
  etag: string;
  lastModified: Date;
  contentType?: string;
}

export interface StorageProvider {
  upload(key: string, stream: Readable, opts: UploadOpts): Promise<StorageUploadResult>;
  download(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  head(key: string): Promise<ObjectMeta>;
  presignGet(key: string, expiresIn: number): Promise<string>;
  presignPut(key: string, expiresIn: number, contentType: string): Promise<string>;
  listPrefix(prefix: string): AsyncIterable<ObjectMeta>;
}

// -- S3 Implementation --

export interface S3StorageProviderOptions {
  bucket: string;
  awsRegion: string;
  awsAccessKey: string;
  awsSecretKey: string;
  minioEndpoint?: string;
  provider?: 'minio' | 's3';
}

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(opts: S3StorageProviderOptions) {
    this.bucket = opts.bucket;
    this.client = getS3({
      awsRegion: opts.awsRegion,
      awsAccessKey: opts.awsAccessKey,
      awsSecretKey: opts.awsSecretKey,
      minioEndpoint: opts.minioEndpoint,
      provider: opts.provider,
    });
  }

  async upload(key: string, stream: Readable, opts: UploadOpts): Promise<StorageUploadResult> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: opts.contentType,
        ...(opts.metadata ? { Metadata: opts.metadata } : {}),
      },
    });

    const result = await upload.done();
    return {
      etag: result.ETag?.replace(/"/g, '') || '',
      versionId: result.VersionId,
    };
  }

  async download(key: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    return result.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    // DeleteObjectsCommand supports max 1000 keys per request
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: batch.map((key) => ({ Key: key })),
            Quiet: true,
          },
        })
      );
    }
  }

  async head(key: string): Promise<ObjectMeta> {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key })
    );
    return {
      key,
      size: result.ContentLength || 0,
      etag: result.ETag?.replace(/"/g, '') || '',
      lastModified: result.LastModified || new Date(),
      contentType: result.ContentType,
    };
  }

  async presignGet(key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(
      this.client as any,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn }
    );
  }

  async presignPut(key: string, expiresIn: number, contentType: string): Promise<string> {
    return getSignedUrl(
      this.client as any,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn }
    );
  }

  async *listPrefix(prefix: string): AsyncIterable<ObjectMeta> {
    let continuationToken: string | undefined;

    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      for (const obj of result.Contents || []) {
        yield {
          key: obj.Key || '',
          size: obj.Size || 0,
          etag: obj.ETag?.replace(/"/g, '') || '',
          lastModified: obj.LastModified || new Date(),
        };
      }

      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }

  destroy(): void {
    this.client.destroy();
  }
}
