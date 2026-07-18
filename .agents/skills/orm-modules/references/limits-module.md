# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for LimitsModule records

## Usage

```typescript
db.limitsModule.findMany({ select: { id: true } }).execute()
db.limitsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.limitsModule.create({ data: { actorTableId: '<UUID>', aggregateTableId: '<UUID>', apiName: '<String>', capCheckTrigger: '<String>', creditCodeItemsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventsTableId: '<UUID>', limitAggregateCheckSoftFunction: '<String>', limitCapsDefaultsTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCheckFunction: '<String>', limitCheckSoftFunction: '<String>', limitCreditsTableId: '<UUID>', limitDecrementFunction: '<String>', limitDecrementTrigger: '<String>', limitIncrementFunction: '<String>', limitIncrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitWarningStateTableId: '<UUID>', limitWarningsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', resolveCapFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.limitsModule.update({ where: { id: '<UUID>' }, data: { actorTableId: '<UUID>' }, select: { id: true } }).execute()
db.limitsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all limitsModule records

```typescript
const items = await db.limitsModule.findMany({
  select: { id: true, actorTableId: true }
}).execute();
```

### Create a limitsModule

```typescript
const item = await db.limitsModule.create({
  data: { actorTableId: '<UUID>', aggregateTableId: '<UUID>', apiName: '<String>', capCheckTrigger: '<String>', creditCodeItemsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventsTableId: '<UUID>', limitAggregateCheckSoftFunction: '<String>', limitCapsDefaultsTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCheckFunction: '<String>', limitCheckSoftFunction: '<String>', limitCreditsTableId: '<UUID>', limitDecrementFunction: '<String>', limitDecrementTrigger: '<String>', limitIncrementFunction: '<String>', limitIncrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitWarningStateTableId: '<UUID>', limitWarningsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', resolveCapFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
