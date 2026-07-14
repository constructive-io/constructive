# dbPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DbPresetModule records

## Usage

```typescript
db.dbPresetModule.findMany({ select: { id: true } }).execute()
db.dbPresetModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbPresetModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', dbPresetsTableId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' }, select: { id: true } }).execute()
db.dbPresetModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.dbPresetModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbPresetModule records

```typescript
const items = await db.dbPresetModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a dbPresetModule

```typescript
const item = await db.dbPresetModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', dbPresetsTableId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' },
  select: { id: true }
}).execute();
```
