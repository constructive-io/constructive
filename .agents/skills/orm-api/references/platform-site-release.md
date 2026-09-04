# platformSiteRelease

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Immutable static-site release manifest head, versioned in the site-owned merkle store

## Usage

```typescript
db.platformSiteRelease.findMany({ select: { id: true } }).execute()
db.platformSiteRelease.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteRelease.create({ data: { commitId: '<UUID>', manifest: '<JSON>', siteId: '<UUID>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.platformSiteRelease.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.platformSiteRelease.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteRelease records

```typescript
const items = await db.platformSiteRelease.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a platformSiteRelease

```typescript
const item = await db.platformSiteRelease.create({
  data: { commitId: '<UUID>', manifest: '<JSON>', siteId: '<UUID>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
