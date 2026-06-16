# billingModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for BillingModule records

## Usage

```typescript
db.billingModule.findMany({ select: { id: true } }).execute()
db.billingModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.billingModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', recordUsageFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.billingModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.billingModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all billingModule records

```typescript
const items = await db.billingModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a billingModule

```typescript
const item = await db.billingModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', recordUsageFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
