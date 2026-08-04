# siteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Native-app deep-link association metadata for a site surface (feeds AASA / assetlinks.json generation)

## Usage

```typescript
db.siteAppLink.findMany({ select: { id: true } }).execute()
db.siteAppLink.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteAppLink.create({ data: { appIdentifier: '<String>', databaseId: '<UUID>', pathComponents: '<String>', platform: '<String>', sha256CertFingerprints: '<String>', siteId: '<UUID>', storeUrl: '<String>', teamId: '<String>', webcredentials: '<Boolean>' }, select: { id: true } }).execute()
db.siteAppLink.update({ where: { id: '<UUID>' }, data: { appIdentifier: '<String>' }, select: { id: true } }).execute()
db.siteAppLink.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteAppLink records

```typescript
const items = await db.siteAppLink.findMany({
  select: { id: true, appIdentifier: true }
}).execute();
```

### Create a siteAppLink

```typescript
const item = await db.siteAppLink.create({
  data: { appIdentifier: '<String>', databaseId: '<UUID>', pathComponents: '<String>', platform: '<String>', sha256CertFingerprints: '<String>', siteId: '<UUID>', storeUrl: '<String>', teamId: '<String>', webcredentials: '<Boolean>' },
  select: { id: true }
}).execute();
```
