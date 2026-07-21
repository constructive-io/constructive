# billingModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for BillingModule records

## Usage

```typescript
db.billingModule.findMany({ select: { id: true } }).execute()
db.billingModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.billingModule.create({ data: { apiName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordUsageFunction: '<String>', rollupUsageSummaryFunction: '<String>', schemaId: '<UUID>', sweepExpiredSubscriptionsFunction: '<String>' }, select: { id: true } }).execute()
db.billingModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.billingModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all billingModule records

```typescript
const items = await db.billingModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a billingModule

```typescript
const item = await db.billingModule.create({
  data: { apiName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordUsageFunction: '<String>', rollupUsageSummaryFunction: '<String>', schemaId: '<UUID>', sweepExpiredSubscriptionsFunction: '<String>' },
  select: { id: true }
}).execute();
```
