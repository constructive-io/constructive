# computeLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ComputeLogModule records

## Usage

```typescript
db.computeLogModule.findMany({ select: { id: true } }).execute()
db.computeLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.computeLogModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.computeLogModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.computeLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all computeLogModule records

```typescript
const items = await db.computeLogModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a computeLogModule

```typescript
const item = await db.computeLogModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
