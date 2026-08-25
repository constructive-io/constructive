# platformGetSitePreviewsRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformGetSitePreviewsRecord records

## Usage

```typescript
db.platformGetSitePreviewsRecord.findMany({ select: { id: true } }).execute()
db.platformGetSitePreviewsRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformGetSitePreviewsRecord.create({ data: { commitId: '<UUID>', name: '<String>' }, select: { id: true } }).execute()
db.platformGetSitePreviewsRecord.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.platformGetSitePreviewsRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformGetSitePreviewsRecord records

```typescript
const items = await db.platformGetSitePreviewsRecord.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a platformGetSitePreviewsRecord

```typescript
const item = await db.platformGetSitePreviewsRecord.create({
  data: { commitId: '<UUID>', name: '<String>' },
  select: { id: true }
}).execute();
```
