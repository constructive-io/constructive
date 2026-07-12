# dbPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DbPresetModule records

## Usage

```typescript
db.dbPresetModule.findMany({ select: { id: true } }).execute()
db.dbPresetModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbPresetModule.create({ data: { databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', scope: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', dbPresetsTableId: '<UUID>', storeName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' }, select: { id: true } }).execute()
db.dbPresetModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.dbPresetModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbPresetModule records

```typescript
const items = await db.dbPresetModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a dbPresetModule

```typescript
const item = await db.dbPresetModule.create({
  data: { databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', scope: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', dbPresetsTableId: '<UUID>', storeName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' },
  select: { id: true }
}).execute();
```
