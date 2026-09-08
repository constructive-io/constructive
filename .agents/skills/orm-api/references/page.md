# page

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site-owned page content — merkle-versioned head over the infra store; never a routing surface

## Usage

```typescript
db.page.findMany({ select: { id: true } }).execute()
db.page.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.page.create({ data: { commitId: '<UUID>', content: '<JSON>', databaseId: '<UUID>', seededFrom: '<JSON>', siteId: '<UUID>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.page.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.page.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all page records

```typescript
const items = await db.page.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a page

```typescript
const item = await db.page.create({
  data: { commitId: '<UUID>', content: '<JSON>', databaseId: '<UUID>', seededFrom: '<JSON>', siteId: '<UUID>', slug: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
