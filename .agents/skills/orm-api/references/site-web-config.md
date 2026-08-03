# siteWebConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Static-site serving configuration for a site surface (index document, clean URLs, SPA fallback)

## Usage

```typescript
db.siteWebConfig.findMany({ select: { id: true } }).execute()
db.siteWebConfig.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteWebConfig.create({ data: { cleanUrls: '<Boolean>', databaseId: '<UUID>', indexDocument: '<String>', metadata: '<JSON>', siteId: '<UUID>', spaFallback: '<Boolean>' }, select: { id: true } }).execute()
db.siteWebConfig.update({ where: { id: '<UUID>' }, data: { cleanUrls: '<Boolean>' }, select: { id: true } }).execute()
db.siteWebConfig.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteWebConfig records

```typescript
const items = await db.siteWebConfig.findMany({
  select: { id: true, cleanUrls: true }
}).execute();
```

### Create a siteWebConfig

```typescript
const item = await db.siteWebConfig.create({
  data: { cleanUrls: '<Boolean>', databaseId: '<UUID>', indexDocument: '<String>', metadata: '<JSON>', siteId: '<UUID>', spaFallback: '<Boolean>' },
  select: { id: true }
}).execute();
```
