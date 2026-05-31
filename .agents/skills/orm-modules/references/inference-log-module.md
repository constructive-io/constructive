# inferenceLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InferenceLogModule records

## Usage

```typescript
db.inferenceLogModule.findMany({ select: { id: true } }).execute()
db.inferenceLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.inferenceLogModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.inferenceLogModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.inferenceLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all inferenceLogModule records

```typescript
const items = await db.inferenceLogModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a inferenceLogModule

```typescript
const item = await db.inferenceLogModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
