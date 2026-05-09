# billingProviderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for BillingProviderModule records

## Usage

```typescript
db.billingProviderModule.findMany({ select: { id: true } }).execute()
db.billingProviderModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.billingProviderModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', provider: '<String>', productsTableId: '<UUID>', pricesTableId: '<UUID>', subscriptionsTableId: '<UUID>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', processBillingEventFunction: '<String>', prefix: '<String>' }, select: { id: true } }).execute()
db.billingProviderModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.billingProviderModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all billingProviderModule records

```typescript
const items = await db.billingProviderModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a billingProviderModule

```typescript
const item = await db.billingProviderModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', provider: '<String>', productsTableId: '<UUID>', pricesTableId: '<UUID>', subscriptionsTableId: '<UUID>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', processBillingEventFunction: '<String>', prefix: '<String>' },
  select: { id: true }
}).execute();
```
