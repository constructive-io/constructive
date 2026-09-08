# platformPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site-owned page content — merkle-versioned head over the infra store; never a routing surface

## Usage

```typescript
db.platformPage.findMany({ select: { id: true } }).execute()
db.platformPage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformPage.create({ data: { commitId: '<UUID>', content: '<JSON>', seededFrom: '<JSON>', siteId: '<UUID>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.platformPage.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.platformPage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformPage records

```typescript
const items = await db.platformPage.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a platformPage

```typescript
const item = await db.platformPage.create({
  data: { commitId: '<UUID>', content: '<JSON>', seededFrom: '<JSON>', siteId: '<UUID>', slug: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
