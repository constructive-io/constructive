# platformSiteErrorPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Custom error pages for a site surface, keyed by HTTP status code

## Usage

```typescript
db.platformSiteErrorPage.findMany({ select: { id: true } }).execute()
db.platformSiteErrorPage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteErrorPage.create({ data: { objectPath: '<String>', siteId: '<UUID>', statusCode: '<Int>' }, select: { id: true } }).execute()
db.platformSiteErrorPage.update({ where: { id: '<UUID>' }, data: { objectPath: '<String>' }, select: { id: true } }).execute()
db.platformSiteErrorPage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteErrorPage records

```typescript
const items = await db.platformSiteErrorPage.findMany({
  select: { id: true, objectPath: true }
}).execute();
```

### Create a platformSiteErrorPage

```typescript
const item = await db.platformSiteErrorPage.create({
  data: { objectPath: '<String>', siteId: '<UUID>', statusCode: '<Int>' },
  select: { id: true }
}).execute();
```
