# transferLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TransferLogModule records

## Usage

```typescript
db.transferLogModule.findMany({ select: { id: true } }).execute()
db.transferLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.transferLogModule.create({ data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' }, select: { id: true } }).execute()
db.transferLogModule.update({ where: { id: '<UUID>' }, data: { actorFkTableId: '<UUID>' }, select: { id: true } }).execute()
db.transferLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all transferLogModule records

```typescript
const items = await db.transferLogModule.findMany({
  select: { id: true, actorFkTableId: true }
}).execute();
```

### Create a transferLogModule

```typescript
const item = await db.transferLogModule.create({
  data: { actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' },
  select: { id: true }
}).execute();
```
