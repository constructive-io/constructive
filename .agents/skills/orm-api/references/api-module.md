# apiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server

## Usage

```typescript
db.apiModule.findMany({ select: { id: true } }).execute()
db.apiModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.apiModule.create({ data: { databaseId: '<UUID>', apiId: '<UUID>', name: '<String>', data: '<JSON>' }, select: { id: true } }).execute()
db.apiModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.apiModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all apiModule records

```typescript
const items = await db.apiModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a apiModule

```typescript
const item = await db.apiModule.create({
  data: { databaseId: '<UUID>', apiId: '<UUID>', name: '<String>', data: '<JSON>' },
  select: { id: true }
}).execute();
```
