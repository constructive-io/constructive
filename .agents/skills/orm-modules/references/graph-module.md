# graphModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GraphModule records

## Usage

```typescript
db.graphModule.findMany({ select: { id: true } }).execute()
db.graphModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.graphModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', graphsTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>' }, select: { id: true } }).execute()
db.graphModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.graphModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all graphModule records

```typescript
const items = await db.graphModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a graphModule

```typescript
const item = await db.graphModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', graphsTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>' },
  select: { id: true }
}).execute();
```
