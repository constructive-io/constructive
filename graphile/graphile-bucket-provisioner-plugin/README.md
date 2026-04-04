# graphile-bucket-provisioner-plugin

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-bucket-provisioner-plugin"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-bucket-provisioner-plugin%2Fpackage.json"/></a>
</p>

PostGraphile v5 plugin that automatically provisions S3-compatible buckets when bucket rows are created in the database. Wraps bucket creation mutations to call [`@constructive-io/bucket-provisioner`](../packages/bucket-provisioner) after the database row is inserted.

## Features

- **Auto-provisioning hook** — Wraps `create*` mutations on tables tagged with `@storageBuckets` to automatically provision S3 buckets after row creation
- **CORS update hook** — Wraps `update*` mutations to detect `allowed_origins` changes and re-apply CORS rules to the S3 bucket
- **3-tier CORS resolution** — Bucket-level `allowed_origins` → storage module-level `allowed_origins` → plugin config `allowedOrigins`
- **Wildcard CORS** — Set `allowed_origins = ['*']` on a bucket for fully open CDN/public deployments
- **Explicit `provisionBucket` mutation** — GraphQL mutation for manual/retry provisioning of any bucket
- **Per-database overrides** — Reads `endpoint`, `provider`, `public_url_prefix`, and `allowed_origins` from the `storage_module` table for multi-tenant setups
- **Lazy S3 config** — Connection config can be a function (evaluated once, cached) to avoid eager env-var reads at import time
- **Graceful error handling** — Provisioning and CORS update failures are logged but never fail the mutation (admin can retry via `provisionBucket`)
- **Custom bucket naming** — Supports prefix-based naming or a fully custom `resolveBucketName` function

## Installation

```bash
pnpm add graphile-bucket-provisioner-plugin
```

## Quick Start

```typescript
import { createBucketProvisionerPlugin } from 'graphile-bucket-provisioner-plugin';

const BucketProvisionerPlugin = createBucketProvisionerPlugin({
  connection: {
    provider: 'minio',
    region: 'us-east-1',
    endpoint: 'http://minio:9000',
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  allowedOrigins: ['https://app.example.com'],
});

// Add to your PostGraphile preset
const preset: GraphileConfig.Preset = {
  plugins: [BucketProvisionerPlugin],
};
```

Or use the convenience preset:

```typescript
import { BucketProvisionerPreset } from 'graphile-bucket-provisioner-plugin';

const preset: GraphileConfig.Preset = {
  extends: [
    BucketProvisionerPreset({
      connection: () => ({
        provider: 'minio',
        region: 'us-east-1',
        endpoint: process.env.S3_ENDPOINT!,
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      }),
      allowedOrigins: ['https://app.example.com'],
    }),
  ],
};
```

## How It Works

### Auto-Provisioning (default)

When a `createBucket` mutation runs on a table tagged with `@storageBuckets`:

1. The original resolver runs first (creates the DB row via RLS)
2. The plugin reads the bucket's `key` and `type` from the mutation input
3. It reads the `storage_module` config for per-database endpoint/provider overrides
4. It calls `BucketProvisioner.provision()` to create and configure the S3 bucket
5. If provisioning fails, the error is logged but the mutation result is returned normally

### Explicit Mutation

The plugin also adds a `provisionBucket` mutation for manual provisioning or retrying failed provisions:

```graphql
mutation {
  provisionBucket(input: { bucketKey: "public" }) {
    success
    bucketName
    accessType
    provider
    endpoint
    error
  }
}
```

This mutation:
1. Reads the bucket row from the database (protected by RLS)
2. Reads the storage module config for the current database
3. Provisions the S3 bucket with the appropriate settings
4. Returns a success/error payload

## API

### `createBucketProvisionerPlugin(options)`

Creates the plugin instance. Returns a `GraphileConfig.Plugin`.

| Option | Type | Description |
|--------|------|-------------|
| `connection` | `StorageConnectionConfig \| () => StorageConnectionConfig` | S3 connection config (static or lazy getter) |
| `allowedOrigins` | `string[]` | CORS allowed origins for bucket configuration |
| `bucketNamePrefix` | `string?` | Prefix for S3 bucket names (e.g., `"myapp"` → `"myapp-public"`) |
| `resolveBucketName` | `(bucketKey, databaseId) => string` | Custom bucket name resolver (takes precedence over prefix) |
| `versioning` | `boolean?` | Enable S3 versioning on provisioned buckets (default: `false`) |
| `autoProvision` | `boolean?` | Enable auto-provisioning hook on create mutations (default: `true`) |

### `BucketProvisionerPreset(options)`

Convenience function that wraps the plugin in a `GraphileConfig.Preset`.

### Connection Config

```typescript
interface StorageConnectionConfig {
  provider: 's3' | 'minio' | 'r2' | 'gcs' | 'spaces';
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}
```

### Smart Tag Detection

The plugin detects tables tagged with `@storageBuckets` (set by the storage module generator in constructive-db):

```sql
COMMENT ON TABLE app_public.buckets IS E'@storageBuckets\nStorage buckets table';
```

The plugin wraps `create*` mutations for auto-provisioning and `update*` mutations for CORS change detection. Delete mutations are not wrapped.

## Error Handling

The plugin is designed to never break mutations:

- **Auto-provisioning errors** are caught and logged. The mutation result is returned normally. The admin can retry via the `provisionBucket` mutation.
- **Explicit `provisionBucket` errors** return a structured payload with `success: false` and an `error` message.
- **Validation errors** (`INVALID_BUCKET_KEY`, `DATABASE_NOT_FOUND`, `STORAGE_MODULE_NOT_PROVISIONED`, `BUCKET_NOT_FOUND`) are thrown as exceptions since they indicate configuration issues.

## Multi-Tenant Support

The plugin reads per-database overrides from the `storage_module` table:

- `endpoint` — Override the S3 endpoint for this database
- `provider` — Override the storage provider for this database
- `public_url_prefix` — CDN/public URL prefix for public buckets

This allows different tenants to use different storage backends while sharing the same plugin configuration.
