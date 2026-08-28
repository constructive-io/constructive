# graphile-bucket-provisioner-plugin

PostGraphile v5 plugin that exposes a `provisionBucket` mutation for manually
queueing storage reconciliation.

The constructive-db `storage:provision_bucket` job is the only component that
mints physical S3 bucket names, provisions S3, and records `physical_name`.
This plugin resolves the logical bucket under RLS and enqueues that job; it
does not call S3 or derive a physical name.

## Installation

```bash
pnpm add graphile-bucket-provisioner-plugin
```

## Usage

```typescript
import { BucketProvisionerPreset } from 'graphile-bucket-provisioner-plugin';

const preset = {
  extends: [BucketProvisionerPreset()],
};
```

The mutation accepts a logical bucket key and optionally an owner entity ID:

```graphql
mutation {
  provisionBucket(input: { bucketKey: "public" }) {
    bucketId
    bucketKey
    physicalName
    jobId
  }
}
```

`provisionBucket` resolves the bucket row under RLS and enqueues the same
`storage:provision_bucket` job used by the database INSERT trigger. Database
scope jobs include `database_id`, use the `bucket:<uuid>` queue, and have
25 attempts. Platform scope jobs use the platform trigger payload. Enqueue
failures are returned as GraphQL errors.

The payload fields are:

| Field | Description |
|-------|-------------|
| `bucketId` | Logical bucket row ID |
| `bucketKey` | Logical bucket key |
| `physicalName` | Recorded physical name, or `null` while reconciliation is pending |
| `jobId` | ID of the queued reconciler job |

There are no plugin options: S3 connection details, naming, CORS, versioning,
and physical-name recording belong to the reconciler.
