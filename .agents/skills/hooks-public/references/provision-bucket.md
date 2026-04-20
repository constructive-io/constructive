# provisionBucket

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

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
