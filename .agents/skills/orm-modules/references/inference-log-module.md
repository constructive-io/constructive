# inferenceLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InferenceLogModule records

## Usage

```typescript
db.inferenceLogModule.findMany({ select: { id: true } }).execute()
db.inferenceLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.inferenceLogModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute()
db.inferenceLogModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.inferenceLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all inferenceLogModule records

```typescript
const items = await db.inferenceLogModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a inferenceLogModule

```typescript
const item = await db.inferenceLogModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' },
  select: { id: true }
}).execute();
```
