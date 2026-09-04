# refusalLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RefusalLogModule records

## Usage

```typescript
db.refusalLogModule.findMany({ select: { id: true } }).execute()
db.refusalLogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.refusalLogModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', logInterval: '<String>', logPremake: '<Int>', logRetention: '<String>', logTableId: '<UUID>', logTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordRefusalsFunction: '<String>', rollupRefusalUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>', summaryInterval: '<String>', summaryPremake: '<Int>', summaryRetention: '<String>', summaryTableId: '<UUID>', summaryTableName: '<String>' }, select: { id: true } }).execute()
db.refusalLogModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.refusalLogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all refusalLogModule records

```typescript
const items = await db.refusalLogModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a refusalLogModule

```typescript
const item = await db.refusalLogModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', logInterval: '<String>', logPremake: '<Int>', logRetention: '<String>', logTableId: '<UUID>', logTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordRefusalsFunction: '<String>', rollupRefusalUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>', summaryInterval: '<String>', summaryPremake: '<Int>', summaryRetention: '<String>', summaryTableId: '<UUID>', summaryTableName: '<String>' },
  select: { id: true }
}).execute();
```
