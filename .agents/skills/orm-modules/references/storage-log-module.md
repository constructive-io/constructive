# storageLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for StorageLogModule records

## Usage

```typescript
db.storageLogModule.findMany({ select: { id: true } }).execute()
db.storageLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.storageLogModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute()
db.storageLogModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.storageLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all storageLogModule records

```typescript
const items = await db.storageLogModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a storageLogModule

```typescript
const item = await db.storageLogModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' },
  select: { id: true }
}).execute();
```
