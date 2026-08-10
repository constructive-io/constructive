# billingProviderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for BillingProviderModule data operations

## Usage

```typescript
useBillingProviderModulesQuery({ selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingInvoicesTableId: true, billingInvoicesTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingRefundsTableId: true, billingRefundsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, id: true, listPendingUsageSyncFunction: true, markUsageSyncedFunction: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, recordRefundFunction: true, schemaId: true, subscriptionsTableId: true, upsertInvoiceFunction: true } } })
useBillingProviderModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingInvoicesTableId: true, billingInvoicesTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingRefundsTableId: true, billingRefundsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, id: true, listPendingUsageSyncFunction: true, markUsageSyncedFunction: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, recordRefundFunction: true, schemaId: true, subscriptionsTableId: true, upsertInvoiceFunction: true } } })
useCreateBillingProviderModuleMutation({ selection: { fields: { id: true } } })
useUpdateBillingProviderModuleMutation({ selection: { fields: { id: true } } })
useDeleteBillingProviderModuleMutation({})
```

## Examples

### List all billingProviderModules

```typescript
const { data, isLoading } = useBillingProviderModulesQuery({
  selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingInvoicesTableId: true, billingInvoicesTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingRefundsTableId: true, billingRefundsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, id: true, listPendingUsageSyncFunction: true, markUsageSyncedFunction: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, recordRefundFunction: true, schemaId: true, subscriptionsTableId: true, upsertInvoiceFunction: true } },
});
```

### Create a billingProviderModule

```typescript
const { mutate } = useCreateBillingProviderModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingInvoicesTableId: '<UUID>', billingInvoicesTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingRefundsTableId: '<UUID>', billingRefundsTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', databaseId: '<UUID>', listPendingUsageSyncFunction: '<String>', markUsageSyncedFunction: '<String>', prefix: '<String>', pricesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', processBillingEventFunction: '<String>', productsTableId: '<UUID>', provider: '<String>', recordRefundFunction: '<String>', schemaId: '<UUID>', subscriptionsTableId: '<UUID>', upsertInvoiceFunction: '<String>' });
```
