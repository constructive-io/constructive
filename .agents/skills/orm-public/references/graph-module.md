# graphModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GraphModule records

## Usage

```typescript
db.graphModule.findMany({ select: { id: true } }).execute()
db.graphModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.graphModule.create({ data: { databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', graphsTableId: '<UUID>', executionsTableId: '<UUID>', execObjectTableId: '<UUID>', apiName: '<String>', scopeField: '<String>' }, select: { id: true } }).execute()
db.graphModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.graphModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all graphModule records

```typescript
const items = await db.graphModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a graphModule

```typescript
const item = await db.graphModule.create({
  data: { databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', graphsTableId: '<UUID>', executionsTableId: '<UUID>', execObjectTableId: '<UUID>', apiName: '<String>', scopeField: '<String>' },
  select: { id: true }
}).execute();
```
