# file

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Individual file records within buckets, with immutable identity fields and mutable metadata

## Usage

```typescript
db.file.findMany({ select: { id: true } }).execute()
db.file.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.file.create({ data: { actorId: '<UUID>', bucketId: '<UUID>', contentHash: '<String>', databaseId: '<UUID>', description: '<String>', downloadUrl: '<String>', expiryEnqueuedAt: '<Datetime>', filePath: '<String>', filename: '<String>', isPublic: '<Boolean>', key: '<String>', mimeType: '<String>', promotedAt: '<Datetime>', size: '<BigInt>', status: '<FileStatus>', tags: '<String>', upload: '<Upload>' }, select: { id: true } }).execute()
db.file.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.file.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all file records

```typescript
const items = await db.file.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a file

```typescript
const item = await db.file.create({
  data: { actorId: '<UUID>', bucketId: '<UUID>', contentHash: '<String>', databaseId: '<UUID>', description: '<String>', downloadUrl: '<String>', expiryEnqueuedAt: '<Datetime>', filePath: '<String>', filename: '<String>', isPublic: '<Boolean>', key: '<String>', mimeType: '<String>', promotedAt: '<Datetime>', size: '<BigInt>', status: '<FileStatus>', tags: '<String>', upload: '<Upload>' },
  select: { id: true }
}).execute();
```
