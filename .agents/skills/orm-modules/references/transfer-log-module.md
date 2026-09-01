# transferLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TransferLogModule records

## Usage

```typescript
db.transferLogModule.findMany({ select: { id: true } }).execute()
db.transferLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.transferLogModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute()
db.transferLogModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.transferLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all transferLogModule records

```typescript
const items = await db.transferLogModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a transferLogModule

```typescript
const item = await db.transferLogModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' },
  select: { id: true }
}).execute();
```
