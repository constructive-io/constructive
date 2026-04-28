# s3-utils

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/s3-utils"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=uploads%2Fs3-utils%2Fpackage.json"/></a>
</p>

Unified S3 utilities for the Constructive ecosystem — client factory, file operations, presigned URLs, and bucket management. Built on AWS SDK v3 with support for multiple S3-compatible providers.

## Features

- **Multi-provider support** — AWS S3, MinIO, Cloudflare R2, Google Cloud Storage, DigitalOcean Spaces
- **Presigned URLs** — generate secure PUT and GET URLs with configurable expiry
- **File operations** — streaming upload, download, existence checks, and metadata retrieval
- **Bucket management** — create buckets with provider-appropriate policies and CORS
- **AWS SDK v3** — modern, modular SDK with tree-shaking support

## Installation

```sh
npm install @constructive-io/s3-utils
```

## Quick Start

```typescript
import {
  createS3Client,
  presignPutUrl,
  presignGetUrl,
  upload,
  download,
} from '@constructive-io/s3-utils';

// 1. Create a client
const client = createS3Client({
  provider: 'minio',
  region: 'us-east-1',
  endpoint: 'http://minio:9000',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
});

// 2. Upload a file via stream
import { createReadStream } from 'fs';

const result = await upload({
  client,
  bucket: 'my-bucket',
  key: 'docs/report.pdf',
  contentType: 'application/pdf',
  readStream: createReadStream('/path/to/report.pdf'),
});

// 3. Generate a presigned download URL
const url = await presignGetUrl(client, {
  bucket: 'my-bucket',
  key: 'docs/report.pdf',
});
```

## API

### `createS3Client(config)`

Creates an `S3Client` with provider-specific defaults.

```typescript
import { createS3Client } from '@constructive-io/s3-utils';

const client = createS3Client({
  provider: 'r2',
  region: 'auto',
  endpoint: 'https://account.r2.cloudflarestorage.com',
  accessKeyId: 'KEY',
  secretAccessKey: 'SECRET',
});
```

**`StorageConnectionConfig`**

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | `'s3' \| 'minio' \| 'r2' \| 'gcs' \| 'spaces'` | yes | Storage provider |
| `region` | `string` | yes | S3 region (e.g. `"us-east-1"`) |
| `endpoint` | `string` | non-AWS | Endpoint URL (required for all providers except `s3`) |
| `accessKeyId` | `string` | yes | Access key ID |
| `secretAccessKey` | `string` | yes | Secret access key |
| `forcePathStyle` | `boolean` | no | Override path-style URL behavior |

Path-style URLs are enabled automatically for `minio`, `r2`, and `gcs`. Virtual-hosted style is used for `s3` and `spaces`.

Throws `S3ConfigError` on invalid configuration.

### `presignPutUrl(client, options)`

Generates a presigned PUT URL for uploading. The URL is locked to the specified key, content type, and content length.

```typescript
const url = await presignPutUrl(client, {
  bucket: 'my-bucket',
  key: 'uploads/photo.jpg',
  contentType: 'image/jpeg',
  contentLength: 102400,
  expiresIn: 900, // default: 900 (15 min)
});
```

### `presignGetUrl(client, options)`

Generates a presigned GET URL for downloading. Supports an optional `filename` for `Content-Disposition`.

```typescript
const url = await presignGetUrl(client, {
  bucket: 'my-bucket',
  key: 'uploads/photo.jpg',
  expiresIn: 3600, // default: 3600 (1 hour)
  filename: 'photo.jpg', // optional, triggers download prompt
});
```

### `headObject(client, bucket, key)`

Checks if an object exists and returns its metadata. Returns `null` if the object is not found.

```typescript
const meta = await headObject(client, 'my-bucket', 'uploads/photo.jpg');
// { contentType: 'image/jpeg', contentLength: 102400 } or null
```

### `fileExists({ client, bucket, key })`

Returns `true` if the object exists, `false` otherwise.

```typescript
const exists = await fileExists({ client, bucket: 'my-bucket', key: 'doc.pdf' });
```

### `upload({ client, bucket, key, readStream, contentType })`

Streams a file to S3 using multipart upload.

```typescript
import { createReadStream } from 'fs';

const result = await upload({
  client,
  bucket: 'my-bucket',
  key: 'uploads/video.mp4',
  contentType: 'video/mp4',
  readStream: createReadStream('/path/to/video.mp4'),
});
// { Location, ETag, Bucket, Key }
```

### `download({ client, bucket, key, writeStream })`

Downloads an object from S3 and pipes it to a writable stream.

```typescript
import { createWriteStream } from 'fs';

await download({
  client,
  bucket: 'my-bucket',
  key: 'uploads/video.mp4',
  writeStream: createWriteStream('/tmp/video.mp4'),
});
```

### `uploadThrough({ client, bucket, key, contentType })`

Returns a `PassThrough` stream that uploads to S3 as data is written. Emits an `'upload'` event with the result when complete.

```typescript
const pass = uploadThrough({
  client,
  bucket: 'my-bucket',
  key: 'stream-data.csv',
  contentType: 'text/csv',
});

pass.on('upload', (result) => {
  console.log('Upload complete:', result.Location);
});

someReadable.pipe(pass);
```

### `createS3Bucket(client, bucket, options)`

Creates a bucket with provider-appropriate policies and CORS configuration.

- **MinIO**: read-only public access policy (list + get)
- **S3/GCS**: full-access policy with CORS rules for browser uploads

```typescript
const { success } = await createS3Bucket(client, 'my-bucket', {
  provider: 'minio',
});
```

Returns `{ success: true }` if the bucket was created or already exists.

## Related Packages

| Package | Description |
|---|---|
| [`@constructive-io/s3-streamer`](../s3-streamer) | Streaming uploads with automatic content-type detection and metadata extraction |
| [`@constructive-io/etag-stream`](../etag-stream) | ETag generation from streams |
| [`@constructive-io/content-type-stream`](../content-type-stream) | Magic-byte content-type detection |
| [`@constructive-io/uuid-hash`](../uuid-hash) | Deterministic UUID generation from file content |

## License

MIT
