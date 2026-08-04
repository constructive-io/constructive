# siteErrorPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Custom error pages for a site surface, keyed by HTTP status code

## Usage

```typescript
db.siteErrorPage.findMany({ select: { id: true } }).execute()
db.siteErrorPage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteErrorPage.create({ data: { databaseId: '<UUID>', objectPath: '<String>', siteId: '<UUID>', statusCode: '<Int>' }, select: { id: true } }).execute()
db.siteErrorPage.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.siteErrorPage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteErrorPage records

```typescript
const items = await db.siteErrorPage.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a siteErrorPage

```typescript
const item = await db.siteErrorPage.create({
  data: { databaseId: '<UUID>', objectPath: '<String>', siteId: '<UUID>', statusCode: '<Int>' },
  select: { id: true }
}).execute();
```
