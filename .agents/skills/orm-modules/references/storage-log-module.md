# storageLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for StorageLogModule records

## Usage

```typescript
db.storageLogModule.findMany({ select: { id: true } }).execute()
db.storageLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.storageLogModule.create({ data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute()
db.storageLogModule.update({ where: { id: '<UUID>' }, data: { actorFkTableId: '<UUID>' }, select: { id: true } }).execute()
db.storageLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all storageLogModule records

```typescript
const items = await db.storageLogModule.findMany({
  select: { id: true, actorFkTableId: true }
}).execute();
```

### Create a storageLogModule

```typescript
const item = await db.storageLogModule.create({
  data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' },
  select: { id: true }
}).execute();
```
