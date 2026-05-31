# secureTableProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent.

## Usage

```typescript
db.secureTableProvision.findMany({ select: { id: true } }).execute()
db.secureTableProvision.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.secureTableProvision.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', nodes: '<JSON>', useRls: '<Boolean>', fields: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFields: '<UUID>' }, select: { id: true } }).execute()
db.secureTableProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.secureTableProvision.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all secureTableProvision records

```typescript
const items = await db.secureTableProvision.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a secureTableProvision

```typescript
const item = await db.secureTableProvision.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', nodes: '<JSON>', useRls: '<Boolean>', fields: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFields: '<UUID>' },
  select: { id: true }
}).execute();
```
