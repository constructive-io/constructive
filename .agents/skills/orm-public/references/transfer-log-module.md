# transferLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TransferLogModule records

## Usage

```typescript
db.transferLogModule.findMany({ select: { id: true } }).execute()
db.transferLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.transferLogModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' }, select: { id: true } }).execute()
db.transferLogModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.transferLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all transferLogModule records

```typescript
const items = await db.transferLogModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a transferLogModule

```typescript
const item = await db.transferLogModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' },
  select: { id: true }
}).execute();
```
