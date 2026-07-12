# dbPool

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database).

## Usage

```typescript
db.dbPool.findMany({ select: { id: true } }).execute()
db.dbPool.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbPool.create({ data: { presetSlug: '<String>', presetCommitId: '<UUID>', databaseId: '<UUID>', status: '<String>', errorMessage: '<String>', expiresAt: '<Datetime>', claimedBy: '<UUID>', claimedAt: '<Datetime>', bootstrapStatus: '<String>', bootstrapError: '<String>' }, select: { id: true } }).execute()
db.dbPool.update({ where: { id: '<UUID>' }, data: { presetSlug: '<String>' }, select: { id: true } }).execute()
db.dbPool.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbPool records

```typescript
const items = await db.dbPool.findMany({
  select: { id: true, presetSlug: true }
}).execute();
```

### Create a dbPool

```typescript
const item = await db.dbPool.create({
  data: { presetSlug: '<String>', presetCommitId: '<UUID>', databaseId: '<UUID>', status: '<String>', errorMessage: '<String>', expiresAt: '<Datetime>', claimedBy: '<UUID>', claimedAt: '<Datetime>', bootstrapStatus: '<String>', bootstrapError: '<String>' },
  select: { id: true }
}).execute();
```
