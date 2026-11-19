# graphile-presigned-url-plugin

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-presigned-url-plugin"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-presigned-url-plugin%2Fpackage.json"/></a>
</p>

Presigned URL upload plugin for PostGraphile v5.

## Features

- `requestUploadUrl` mutation — generates presigned PUT URLs for direct client-to-S3 upload
- `downloadUrl` computed field — presigned GET URLs for private files, public URLs for public files
- `maxBulkFiles` field on bucket types — the most files one bulk-upload call accepts (`storage_module.max_bulk_files`, default 100)
- Content-hash based S3 keys (SHA-256) with automatic deduplication — only against rows whose bytes are in S3, so a retry of a never-completed upload gets a fresh URL
- Per-bucket MIME type and file size validation

## Custom upload keys

A custom key names an object in a bucket that allows custom keys. A visible, confirmed file at that key with the same SHA-256 is reused without a PUT. A different digest or an outstanding reservation returns `FILE_NOT_REPLACEABLE` without a write URL. A rejected reservation also blocks reuse until it is removed. A 64-character lowercase SHA-256 key cannot be used for other content. For a new revision, upload under a new key and update the business reference after confirmation.

Single and bulk uploads take the same transaction-scoped lock for the physical bucket and object key, including when a custom key equals a default content hash. Before signing a new named upload, CNC also checks that the object does not already exist. These checks do not change bucket CORS or require new PUT headers.

The lock covers the database transaction, not the lifetime of the signed URL. Row-level security can hide another caller's pending reservation, and an object-store check is not an atomic reservation: two requests may still receive URLs when no bytes have landed yet. Other writers and previously issued URLs can also race a later upload. A conflict does not disclose a file ID, hash, or owner.

## Usage

```typescript
import { PresignedUrlPreset } from 'graphile-presigned-url-plugin';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

const preset = {
  extends: [
    PresignedUrlPreset({
      s3: {
        client: s3Client,
        bucket: 'my-uploads',
        publicUrlPrefix: 'https://cdn.example.com',
      },
      urlExpirySeconds: 900,
      maxFileSize: 200 * 1024 * 1024,
    }),
  ],
};
```
