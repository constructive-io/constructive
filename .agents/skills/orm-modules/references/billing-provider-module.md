# billingProviderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for BillingProviderModule records

## Usage

```typescript
db.billingProviderModule.findMany({ select: { id: true } }).execute()
db.billingProviderModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.billingProviderModule.create({ data: { apiName: '<String>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingInvoicesTableId: '<UUID>', billingInvoicesTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingRefundsTableId: '<UUID>', billingRefundsTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', databaseId: '<UUID>', listPendingUsageSyncFunction: '<String>', markUsageSyncedFunction: '<String>', prefix: '<String>', pricesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', processBillingEventFunction: '<String>', productsTableId: '<UUID>', provider: '<String>', recordRefundFunction: '<String>', schemaId: '<UUID>', subscriptionsTableId: '<UUID>', upsertInvoiceFunction: '<String>' }, select: { id: true } }).execute()
db.billingProviderModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.billingProviderModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all billingProviderModule records

```typescript
const items = await db.billingProviderModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a billingProviderModule

```typescript
const item = await db.billingProviderModule.create({
  data: { apiName: '<String>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingInvoicesTableId: '<UUID>', billingInvoicesTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingRefundsTableId: '<UUID>', billingRefundsTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', databaseId: '<UUID>', listPendingUsageSyncFunction: '<String>', markUsageSyncedFunction: '<String>', prefix: '<String>', pricesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', processBillingEventFunction: '<String>', productsTableId: '<UUID>', provider: '<String>', recordRefundFunction: '<String>', schemaId: '<UUID>', subscriptionsTableId: '<UUID>', upsertInvoiceFunction: '<String>' },
  select: { id: true }
}).execute();
```
