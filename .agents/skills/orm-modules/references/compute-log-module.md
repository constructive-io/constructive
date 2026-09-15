# computeLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ComputeLogModule records

## Usage

```typescript
db.computeLogModule.findMany({ select: { id: true } }).execute()
db.computeLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.computeLogModule.create({ data: { apiName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute()
db.computeLogModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.computeLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all computeLogModule records

```typescript
const items = await db.computeLogModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a computeLogModule

```typescript
const item = await db.computeLogModule.create({
  data: { apiName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' },
  select: { id: true }
}).execute();
```
