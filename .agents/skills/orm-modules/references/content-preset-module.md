# contentPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ContentPresetModule records

## Usage

```typescript
db.contentPresetModule.findMany({ select: { id: true } }).execute()
db.contentPresetModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.contentPresetModule.create({ data: { apiName: '<String>', contentPresetsTableId: '<UUID>', databaseId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' }, select: { id: true } }).execute()
db.contentPresetModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.contentPresetModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all contentPresetModule records

```typescript
const items = await db.contentPresetModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a contentPresetModule

```typescript
const item = await db.contentPresetModule.create({
  data: { apiName: '<String>', contentPresetsTableId: '<UUID>', databaseId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' },
  select: { id: true }
}).execute();
```
