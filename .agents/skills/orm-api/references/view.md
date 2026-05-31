# view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for View records

## Usage

```typescript
db.view.findMany({ select: { id: true } }).execute()
db.view.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.view.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', tableId: '<UUID>', viewType: '<String>', data: '<JSON>', filterType: '<String>', filterData: '<JSON>', securityInvoker: '<Boolean>', isReadOnly: '<Boolean>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.view.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.view.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all view records

```typescript
const items = await db.view.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a view

```typescript
const item = await db.view.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', tableId: '<UUID>', viewType: '<String>', data: '<JSON>', filterType: '<String>', filterData: '<JSON>', securityInvoker: '<Boolean>', isReadOnly: '<Boolean>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
