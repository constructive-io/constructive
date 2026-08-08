/**
 * Upload resolver for the Constructive upload plugin (multipart `Upload` scalar).
 *
 * This is the streaming transport into the *managed* storage lane: bytes arrive
 * on the mutation, and the file they carry gets the same treatment a presigned
 * upload gets — a bucket resolved inside the tenant, a content-addressed key, a
 * files row, and a projection document naming that row.
 *
 * It used to be a second storage model: stream to `BUCKET_NAME` under a random
 * key, hand back a URL, record nothing. Objects written that way belonged to no
 * database, could not be deduplicated, listed, or access-controlled, and storage
 * GC could not see that a document still pointed at them. There is no
 * environment bucket in this path any more; `cdn.*` supplies S3 credentials and
 * an endpoint only.
 *
 * Compatibility: `image`/`upload` columns still receive `url` alongside the new
 * `id`/`key`/`bucket_id`/`size` fields, so existing readers of `photo.url` keep
 * working while they migrate to `id` + the files row's late-bound `downloadUrl`.
 *
 * ENV VARS (S3 connection only):
 *   BUCKET_PROVIDER  - 'minio' | 's3' (default: 'minio')
 *   AWS_REGION       - AWS region (default: 'us-east-1')
 *   AWS_ACCESS_KEY   - access key (default: 'minioadmin')
 *   AWS_SECRET_KEY   - secret key (default: 'minioadmin')
 *   CDN_ENDPOINT     - S3-compatible endpoint (default: 'http://localhost:9000')
 */

import { getEnvOptions } from '@constructive-io/graphql-env';
import Streamer from '@constructive-io/s3-streamer';
import { Logger } from '@pgpmjs/logger';
import { createHash, randomUUID } from 'crypto';
import {
  finalizeStagedUpload,
  type PresignedUrlPluginOptions,
  resolveManagedUploadTarget,
  withRequestPgClient,
} from 'graphile-presigned-url-plugin';
import type {
  FileUpload,
  UploadFieldDefinition,
  UploadFieldIdentity,
  UploadPluginInfo,
} from 'graphile-upload-plugin';
import { Transform } from 'stream';

import {
  createBucketNameResolver,
  createEnsureBucketProvisioned,
  getPresignedUrlS3Config,
} from './presigned-url-resolver';

const log = new Logger('upload-resolver');
const DEFAULT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

let streamer: Streamer | null = null;

/**
 * The S3 streamer, built from the CDN connection settings.
 *
 * Deliberately constructed with no `defaultBucket`: every upload names the
 * bucket it resolved, and a default here would be an environment-owned bucket
 * standing in for a tenant's.
 */
function getStreamer(): Streamer {
  if (streamer) return streamer;

  const { cdn = {} } = getEnvOptions();

  if (process.env.NODE_ENV === 'production' && (!cdn.awsAccessKey || !cdn.awsSecretKey)) {
    log.warn('[upload-resolver] WARNING: Using default credentials in production.');
  }

  const provider = cdn.provider || 'minio';
  log.info(`[upload-resolver] Initializing: provider=${provider}`);

  streamer = new Streamer({
    provider,
    awsRegion: cdn.awsRegion || 'us-east-1',
    awsAccessKey: cdn.awsAccessKey || 'minioadmin',
    awsSecretKey: cdn.awsSecretKey || 'minioadmin',
    endpoint: cdn.endpoint || 'http://localhost:9000',
  });

  return streamer;
}

/**
 * The upload lane's view of the presigned plugin's options: the same S3
 * connection, physical-name policy, and provisioning hook the presigned lane
 * uses, so both transports resolve identical coordinates for a bucket.
 *
 * Built on first upload rather than at import time — `createBucketNameResolver`
 * throws on a missing name prefix, and that must surface as a failed upload, not
 * as a server that will not boot.
 */
let managedOptions: PresignedUrlPluginOptions | null = null;

function getManagedOptions(): PresignedUrlPluginOptions {
  if (!managedOptions) {
    managedOptions = {
      s3: getPresignedUrlS3Config,
      resolveBucketName: createBucketNameResolver(),
      ensureBucketProvisioned: createEnsureBucketProvisioned(),
    };
  }
  return managedOptions;
}

/** A staging key: transient, and never what the object ends up under. */
function stagingKey(): string {
  return `.staging/${randomUUID()}`;
}

async function resolveDatabaseId(pgClient: any): Promise<string | null> {
  const result = await pgClient.query({ text: `SELECT jwt_private.current_database_id() AS id` });
  return result.rows[0]?.id ?? null;
}

/**
 * Which default bucket an *unregistered* column resolves to.
 *
 * Columns written by the pre-managed resolver held a directly-embedded URL, so
 * their readers assume a publicly addressable object; resolving them to the
 * private default would break every page rendering one. A registered column
 * states its own intent and this is not consulted.
 */
const LEGACY_DEFAULT_PUBLIC_ACCESS = true;

/** The mime allowlist for a column, from its smart tags or its type. */
function allowedMimeTypes(tags: Record<string, any> | undefined, typ: string | undefined): string[] {
  const VALID_MIME = /^[a-z]+\/[a-z0-9][a-z0-9!#$&\-.^_+]*$/i;
  if (tags?.mime) {
    return String(tags.mime)
      .trim()
      .split(',')
      .map((a: string) => a.trim())
      .filter((m: string) => VALID_MIME.test(m));
  }
  return typ === 'image' ? DEFAULT_IMAGE_MIME_TYPES : [];
}

/**
 * Hash and measure bytes as they stream past, without buffering them.
 *
 * The final key is the content hash, which is only known once the last byte has
 * gone by — so the object is staged first and promoted after. Nothing is held in
 * memory: a 2GB upload streams through this the same as a 2KB one.
 */
function hashingPassThrough(): Transform & { digest: () => string; bytes: () => number } {
  const hash = createHash('sha256');
  let bytes = 0;
  const stream = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      bytes += chunk.length;
      callback(null, chunk);
    },
  });
  return Object.assign(stream, {
    digest: () => hash.digest('hex'),
    bytes: () => bytes,
  });
}

/**
 * Stream an upload into managed storage and return the value the column stores.
 *
 * Shape by column type hint:
 *   * `image` / `upload` (jsonb domains) → the projection document, including a
 *     compatibility `url` for public buckets.
 *   * `attachment` (text domain) → the object's public URL. A text column cannot
 *     hold a projection, so the files row is still authoritative but the column
 *     itself carries no id; the row keeps the object alive. A private bucket
 *     raises rather than storing an expiring presigned URL in a column.
 */
async function uploadResolver(
  upload: FileUpload,
  _args: unknown,
  context: any,
  info: { uploadPlugin: UploadPluginInfo },
): Promise<unknown> {
  const { tags, type, field } = info.uploadPlugin;
  const typ = type || tags?.type;

  const withPgClient = context?.withPgClient;
  const pgSettings = context?.pgSettings ?? null;
  if (!withPgClient) {
    throw new Error(
      'UPLOAD_NO_PG_CLIENT: a managed upload resolves its bucket in the database, so the ' +
      'GraphQL context must carry withPgClient',
    );
  }
  if (!field) {
    throw new Error(
      'UPLOAD_FIELD_UNKNOWN: the upload plugin did not report which column is being written, ' +
      'so the storage module and bucket backing it cannot be resolved',
    );
  }

  const databaseId = await withRequestPgClient(withPgClient, pgSettings, (pgClient: any) =>
    resolveDatabaseId(pgClient),
  );
  if (!databaseId) throw new Error('DATABASE_NOT_FOUND');

  const target = await resolveManagedUploadTarget({
    options: getManagedOptions(),
    withPgClient,
    pgSettings,
    databaseId,
    field: field as UploadFieldIdentity,
    defaultPublicAccess: LEGACY_DEFAULT_PUBLIC_ACCESS,
  });

  if (typ === 'attachment' && !target.bucket.is_public) {
    throw new Error(
      'ATTACHMENT_BUCKET_NOT_PUBLIC: an attachment column stores a plain URL, and the resolved ' +
      `bucket "${target.bucket.key}" is private, whose only URLs expire. Use an upload column, ` +
      'which stores the file id and resolves a fresh download URL on read.',
    );
  }

  const s3 = getStreamer();
  const { filename } = upload;

  // Validate before persisting: content type comes from the leading bytes, not
  // from the client's claim about them.
  const detected = await s3.detectContentType({
    readStream: upload.createReadStream(),
    filename,
  });
  const allowed = allowedMimeTypes(tags, typ);
  if (allowed.length && !allowed.includes(detected.contentType)) {
    detected.stream.destroy();
    throw new Error('UPLOAD_MIMETYPE');
  }

  const staged = stagingKey();
  const hashing = hashingPassThrough();
  const uploadResult = await s3.uploadWithContentType({
    readStream: detected.stream.pipe(hashing),
    contentType: detected.contentType,
    magic: detected.magic,
    key: staged,
    bucket: target.physicalName,
  });

  // Owns the staged key from here: it either promotes it into a files row or
  // removes it, so a failed upload leaves nothing behind in S3.
  const { projection } = await finalizeStagedUpload({
    target,
    withPgClient,
    pgSettings,
    staged: {
      stagingKey: staged,
      contentHash: hashing.digest(),
      contentType: uploadResult.contentType,
      size: hashing.bytes(),
      filename,
    },
  });

  switch (typ) {
  case 'image':
  case 'upload':
    // `filename` and `mime` were in the pre-managed shape and stay in it;
    // `url` is populated for public buckets and deprecated in favour of `id`.
    return { ...projection, filename, mime: uploadResult.contentType };
  case 'attachment':
  default:
    if (!projection.url) {
      throw new Error(
        `ATTACHMENT_NO_PUBLIC_URL: bucket "${target.bucket.key}" has no public URL prefix ` +
        'configured, so there is no durable URL to store in a text column',
      );
    }
    return projection.url;
  }
}

/**
 * Upload field definitions for Constructive's three upload domain types.
 *
 * These match columns whose PostgreSQL type is one of the domains defined
 * in constructive-db/pgpm-modules/types/:
 *
 * - `image`      (public schema) — jsonb domain for images with versions
 * - `upload`     (public schema) — jsonb domain for generic file uploads
 * - `attachment` (public schema) — text domain for simple URL attachments
 *
 * These domain types are part of the platform's core type system, deployed
 * to every application database. They rarely change, so this config is stable.
 */
export const constructiveUploadFieldDefinitions: UploadFieldDefinition[] = [
  {
    name: 'image',
    namespaceName: 'public',
    type: 'image',
    resolve: uploadResolver,
  },
  {
    name: 'upload',
    namespaceName: 'public',
    type: 'upload',
    resolve: uploadResolver,
  },
  {
    name: 'attachment',
    namespaceName: 'public',
    type: 'attachment',
    resolve: uploadResolver,
  },
];
