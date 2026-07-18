# dbPool

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database).

## Usage

```typescript
useDbPoolsQuery({ selection: { fields: { bootstrapError: true, bootstrapStatus: true, claimedAt: true, claimedBy: true, createdAt: true, databaseId: true, errorMessage: true, expiresAt: true, id: true, presetCommitId: true, presetSlug: true, status: true, updatedAt: true } } })
useDbPoolQuery({ id: '<UUID>', selection: { fields: { bootstrapError: true, bootstrapStatus: true, claimedAt: true, claimedBy: true, createdAt: true, databaseId: true, errorMessage: true, expiresAt: true, id: true, presetCommitId: true, presetSlug: true, status: true, updatedAt: true } } })
useCreateDbPoolMutation({ selection: { fields: { id: true } } })
useUpdateDbPoolMutation({ selection: { fields: { id: true } } })
useDeleteDbPoolMutation({})
```

## Examples

### List all dbPools

```typescript
const { data, isLoading } = useDbPoolsQuery({
  selection: { fields: { bootstrapError: true, bootstrapStatus: true, claimedAt: true, claimedBy: true, createdAt: true, databaseId: true, errorMessage: true, expiresAt: true, id: true, presetCommitId: true, presetSlug: true, status: true, updatedAt: true } },
});
```

### Create a dbPool

```typescript
const { mutate } = useCreateDbPoolMutation({
  selection: { fields: { id: true } },
});
mutate({ bootstrapError: '<String>', bootstrapStatus: '<String>', claimedAt: '<Datetime>', claimedBy: '<UUID>', databaseId: '<UUID>', errorMessage: '<String>', expiresAt: '<Datetime>', presetCommitId: '<UUID>', presetSlug: '<String>', status: '<String>' });
```
