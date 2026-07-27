# siteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Frontend module configuration for a site surface; stores module name and JSON settings

## Usage

```typescript
db.siteModule.findMany({ select: { id: true } }).execute()
db.siteModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteModule.create({ data: { data: '<JSON>', databaseId: '<UUID>', name: '<String>', siteId: '<UUID>' }, select: { id: true } }).execute()
db.siteModule.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.siteModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteModule records

```typescript
const items = await db.siteModule.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a siteModule

```typescript
const item = await db.siteModule.create({
  data: { data: '<JSON>', databaseId: '<UUID>', name: '<String>', siteId: '<UUID>' },
  select: { id: true }
}).execute();
```
