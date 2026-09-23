# siteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-host native-app association for a site surface: which app-owned store identity this host serves, and the path patterns it claims (joined with the store identity to render AASA / assetlinks.json)

## Usage

```typescript
db.siteAppLink.findMany({ select: { id: true } }).execute()
db.siteAppLink.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteAppLink.create({ data: { appStoreIdentityId: '<UUID>', databaseId: '<UUID>', pathComponents: '<String>', siteId: '<UUID>', webcredentials: '<Boolean>' }, select: { id: true } }).execute()
db.siteAppLink.update({ where: { id: '<UUID>' }, data: { appStoreIdentityId: '<UUID>' }, select: { id: true } }).execute()
db.siteAppLink.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteAppLink records

```typescript
const items = await db.siteAppLink.findMany({
  select: { id: true, appStoreIdentityId: true }
}).execute();
```

### Create a siteAppLink

```typescript
const item = await db.siteAppLink.create({
  data: { appStoreIdentityId: '<UUID>', databaseId: '<UUID>', pathComponents: '<String>', siteId: '<UUID>', webcredentials: '<Boolean>' },
  select: { id: true }
}).execute();
```
