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
- Independent server-allocated object keys (`originals/<UUID>`), with SHA-256 integrity and deduplication of confirmed content in the same logical slot
- Per-bucket MIME type and file size validation

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

## Upload identity and retries

The optional upload input `key` names a **logical slot** (`files.logical_key`);
without it the logical slot is the SHA-256 content hash. It never chooses an S3
location. The generated recorder allocates a fresh `originals/<UUID>` for each
new request and returns it as `files.key`. The response `key`, projection `key`,
PUT signature and downloads all use that physical key.

A confirmed (`uploaded`/`processed`) row with the same bucket, logical key and
checksum is reused, without issuing a PUT URL. Pending or rejected attempts do
not deduplicate: a new request gets a new object and confirm job, and leaves the
older attempt to its existing lifecycle. Repeating a PUT with the same URL is a
retry of that same object; checksum and upload-id must still match its signature.

This requires the matching constructive-db storage generator with `logical_key`
and a server-allocated recorder result. Deploy the generator and pinned package
together; there is no fallback to signing the caller's logical key. Successful
logical replacement retains the existing database authorization policy; UUIDs
are object identities, not access control.
