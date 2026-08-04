# platformSiteWebConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Static-site serving configuration for a site surface (index document, clean URLs, SPA fallback)

## Usage

```typescript
db.platformSiteWebConfig.findMany({ select: { id: true } }).execute()
db.platformSiteWebConfig.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteWebConfig.create({ data: { cleanUrls: '<Boolean>', indexDocument: '<String>', metadata: '<JSON>', siteId: '<UUID>', spaFallback: '<Boolean>' }, select: { id: true } }).execute()
db.platformSiteWebConfig.update({ where: { id: '<UUID>' }, data: { cleanUrls: '<Boolean>' }, select: { id: true } }).execute()
db.platformSiteWebConfig.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteWebConfig records

```typescript
const items = await db.platformSiteWebConfig.findMany({
  select: { id: true, cleanUrls: true }
}).execute();
```

### Create a platformSiteWebConfig

```typescript
const item = await db.platformSiteWebConfig.create({
  data: { cleanUrls: '<Boolean>', indexDocument: '<String>', metadata: '<JSON>', siteId: '<UUID>', spaFallback: '<Boolean>' },
  select: { id: true }
}).execute();
```
