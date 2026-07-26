# view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for View records

## Usage

```typescript
db.view.findMany({ select: { id: true } }).execute()
db.view.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.view.create({ data: { category: '<ObjectCategory>', checkOption: '<String>', data: '<JSON>', databaseId: '<UUID>', filterData: '<JSON>', filterType: '<String>', isReadOnly: '<Boolean>', name: '<String>', schemaId: '<UUID>', securityBarrier: '<Boolean>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', viewType: '<String>' }, select: { id: true } }).execute()
db.view.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.view.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all view records

```typescript
const items = await db.view.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a view

```typescript
const item = await db.view.create({
  data: { category: '<ObjectCategory>', checkOption: '<String>', data: '<JSON>', databaseId: '<UUID>', filterData: '<JSON>', filterType: '<String>', isReadOnly: '<Boolean>', name: '<String>', schemaId: '<UUID>', securityBarrier: '<Boolean>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', viewType: '<String>' },
  select: { id: true }
}).execute();
```
