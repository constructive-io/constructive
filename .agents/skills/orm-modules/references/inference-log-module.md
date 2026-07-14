# inferenceLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InferenceLogModule records

## Usage

```typescript
db.inferenceLogModule.findMany({ select: { id: true } }).execute()
db.inferenceLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.inferenceLogModule.create({ data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>' }, select: { id: true } }).execute()
db.inferenceLogModule.update({ where: { id: '<UUID>' }, data: { actorFkTableId: '<UUID>' }, select: { id: true } }).execute()
db.inferenceLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all inferenceLogModule records

```typescript
const items = await db.inferenceLogModule.findMany({
  select: { id: true, actorFkTableId: true }
}).execute();
```

### Create a inferenceLogModule

```typescript
const item = await db.inferenceLogModule.create({
  data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>' },
  select: { id: true }
}).execute();
```
