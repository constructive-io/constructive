# provisionBucket

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reconcile an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then enqueues the same
storage:provision_bucket job used by the INSERT trigger. This is
idempotent for an already-reconciled bucket; enqueue failures become
GraphQL errors.

## Usage

```typescript
const { mutate } = useProvisionBucketMutation(); mutate({ input: { bucketKey: '<String>', ownerId: '<UUID>' } });
```

## Examples

### Use useProvisionBucketMutation

```typescript
const { mutate, isLoading } = useProvisionBucketMutation();
mutate({ input: { bucketKey: '<String>', ownerId: '<UUID>' } });
```
