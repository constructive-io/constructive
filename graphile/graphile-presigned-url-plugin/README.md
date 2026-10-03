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
- Content-hash based S3 keys (SHA-256) with automatic deduplication
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

### Internal vs public storage endpoint

`client` is what the server uses to talk to storage. Presigned URLs are handed to
clients, and SigV4 signs the `Host` header, so they must be signed for the host
the client will call. When storage is reached over an internal address (e.g. an
in-cluster Service), pass a second client configured with the public endpoint:

```typescript
s3: {
  client: internalClient,        // endpoint: http://minio.storage.svc.cluster.local:9000
  presignClient: publicClient,   // endpoint: https://storage.example.com
  publicEndpoint: 'https://storage.example.com',
  bucket: 'my-uploads',
}
```

Without `presignClient`, URLs are signed with `client`. In the Constructive server
this is `CDN_ENDPOINT` (internal) and `CDN_PUBLIC_ENDPOINT` (public).
