# platformSiteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-host native-app association for a site surface: which app-owned store identity this host serves, and the path patterns it claims (joined with the store identity to render AASA / assetlinks.json)

## Usage

```typescript
db.platformSiteAppLink.findMany({ select: { id: true } }).execute()
db.platformSiteAppLink.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteAppLink.create({ data: { appStoreIdentityId: '<UUID>', pathComponents: '<String>', siteId: '<UUID>', webcredentials: '<Boolean>' }, select: { id: true } }).execute()
db.platformSiteAppLink.update({ where: { id: '<UUID>' }, data: { appStoreIdentityId: '<UUID>' }, select: { id: true } }).execute()
db.platformSiteAppLink.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteAppLink records

```typescript
const items = await db.platformSiteAppLink.findMany({
  select: { id: true, appStoreIdentityId: true }
}).execute();
```

### Create a platformSiteAppLink

```typescript
const item = await db.platformSiteAppLink.create({
  data: { appStoreIdentityId: '<UUID>', pathComponents: '<String>', siteId: '<UUID>', webcredentials: '<Boolean>' },
  select: { id: true }
}).execute();
```
