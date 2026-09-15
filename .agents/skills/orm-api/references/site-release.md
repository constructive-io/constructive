# siteRelease

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Immutable static-site release manifest head, versioned in the site-owned merkle store

## Usage

```typescript
db.siteRelease.findMany({ select: { id: true } }).execute()
db.siteRelease.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteRelease.create({ data: { commitId: '<UUID>', databaseId: '<UUID>', manifest: '<JSON>', siteId: '<UUID>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.siteRelease.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.siteRelease.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteRelease records

```typescript
const items = await db.siteRelease.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a siteRelease

```typescript
const item = await db.siteRelease.create({
  data: { commitId: '<UUID>', databaseId: '<UUID>', manifest: '<JSON>', siteId: '<UUID>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
