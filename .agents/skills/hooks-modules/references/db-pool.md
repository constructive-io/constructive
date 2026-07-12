# dbPool

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database).

## Usage

```typescript
useDbPoolsQuery({ selection: { fields: { id: true, presetSlug: true, presetCommitId: true, databaseId: true, status: true, errorMessage: true, expiresAt: true, claimedBy: true, claimedAt: true, bootstrapStatus: true, bootstrapError: true, createdAt: true, updatedAt: true } } })
useDbPoolQuery({ id: '<UUID>', selection: { fields: { id: true, presetSlug: true, presetCommitId: true, databaseId: true, status: true, errorMessage: true, expiresAt: true, claimedBy: true, claimedAt: true, bootstrapStatus: true, bootstrapError: true, createdAt: true, updatedAt: true } } })
useCreateDbPoolMutation({ selection: { fields: { id: true } } })
useUpdateDbPoolMutation({ selection: { fields: { id: true } } })
useDeleteDbPoolMutation({})
```

## Examples

### List all dbPools

```typescript
const { data, isLoading } = useDbPoolsQuery({
  selection: { fields: { id: true, presetSlug: true, presetCommitId: true, databaseId: true, status: true, errorMessage: true, expiresAt: true, claimedBy: true, claimedAt: true, bootstrapStatus: true, bootstrapError: true, createdAt: true, updatedAt: true } },
});
```

### Create a dbPool

```typescript
const { mutate } = useCreateDbPoolMutation({
  selection: { fields: { id: true } },
});
mutate({ presetSlug: '<String>', presetCommitId: '<UUID>', databaseId: '<UUID>', status: '<String>', errorMessage: '<String>', expiresAt: '<Datetime>', claimedBy: '<UUID>', claimedAt: '<Datetime>', bootstrapStatus: '<String>', bootstrapError: '<String>' });
```
