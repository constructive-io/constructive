# getSitePreviewsRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GetSitePreviewsRecord records

## Usage

```typescript
db.getSitePreviewsRecord.findMany({ select: { id: true } }).execute()
db.getSitePreviewsRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.getSitePreviewsRecord.create({ data: { commitId: '<UUID>', name: '<String>' }, select: { id: true } }).execute()
db.getSitePreviewsRecord.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.getSitePreviewsRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all getSitePreviewsRecord records

```typescript
const items = await db.getSitePreviewsRecord.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a getSitePreviewsRecord

```typescript
const item = await db.getSitePreviewsRecord.create({
  data: { commitId: '<UUID>', name: '<String>' },
  select: { id: true }
}).execute();
```
