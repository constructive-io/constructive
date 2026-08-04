# platformSiteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Native-app deep-link association metadata for a site surface (feeds AASA / assetlinks.json generation)

## Usage

```typescript
db.platformSiteAppLink.findMany({ select: { id: true } }).execute()
db.platformSiteAppLink.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteAppLink.create({ data: { appIdentifier: '<String>', pathComponents: '<String>', platform: '<String>', sha256CertFingerprints: '<String>', siteId: '<UUID>', storeUrl: '<String>', teamId: '<String>', webcredentials: '<Boolean>' }, select: { id: true } }).execute()
db.platformSiteAppLink.update({ where: { id: '<UUID>' }, data: { appIdentifier: '<String>' }, select: { id: true } }).execute()
db.platformSiteAppLink.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteAppLink records

```typescript
const items = await db.platformSiteAppLink.findMany({
  select: { id: true, appIdentifier: true }
}).execute();
```

### Create a platformSiteAppLink

```typescript
const item = await db.platformSiteAppLink.create({
  data: { appIdentifier: '<String>', pathComponents: '<String>', platform: '<String>', sha256CertFingerprints: '<String>', siteId: '<UUID>', storeUrl: '<String>', teamId: '<String>', webcredentials: '<Boolean>' },
  select: { id: true }
}).execute();
```
