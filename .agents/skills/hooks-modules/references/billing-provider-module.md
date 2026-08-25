# billingProviderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for BillingProviderModule data operations

## Usage

```typescript
useBillingProviderModulesQuery({ selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingDisputesTableId: true, billingDisputesTableName: true, billingInvoicesTableId: true, billingInvoicesTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingRefundsTableId: true, billingRefundsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, getActivePlanPricingFunction: true, getBillingCustomerFunction: true, getBillingPriceFunction: true, getBillingProductFunction: true, getBillingSubscriptionFunction: true, getFallbackFreePlanFunction: true, id: true, listPendingUsageSyncFunction: true, markUsageSyncedFunction: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, recordDisputeFunction: true, recordRefundFunction: true, schemaId: true, subscriptionsTableId: true, sweepOverdueSubscriptionsFunction: true, upsertBillingCustomerFunction: true, upsertBillingPriceFunction: true, upsertBillingProductFunction: true, upsertBillingSubscriptionFunction: true, upsertInvoiceFunction: true } } })
useBillingProviderModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingDisputesTableId: true, billingDisputesTableName: true, billingInvoicesTableId: true, billingInvoicesTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingRefundsTableId: true, billingRefundsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, getActivePlanPricingFunction: true, getBillingCustomerFunction: true, getBillingPriceFunction: true, getBillingProductFunction: true, getBillingSubscriptionFunction: true, getFallbackFreePlanFunction: true, id: true, listPendingUsageSyncFunction: true, markUsageSyncedFunction: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, recordDisputeFunction: true, recordRefundFunction: true, schemaId: true, subscriptionsTableId: true, sweepOverdueSubscriptionsFunction: true, upsertBillingCustomerFunction: true, upsertBillingPriceFunction: true, upsertBillingProductFunction: true, upsertBillingSubscriptionFunction: true, upsertInvoiceFunction: true } } })
useCreateBillingProviderModuleMutation({ selection: { fields: { id: true } } })
useUpdateBillingProviderModuleMutation({ selection: { fields: { id: true } } })
useDeleteBillingProviderModuleMutation({})
```

## Examples

### List all billingProviderModules

```typescript
const { data, isLoading } = useBillingProviderModulesQuery({
  selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingDisputesTableId: true, billingDisputesTableName: true, billingInvoicesTableId: true, billingInvoicesTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingRefundsTableId: true, billingRefundsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, getActivePlanPricingFunction: true, getBillingCustomerFunction: true, getBillingPriceFunction: true, getBillingProductFunction: true, getBillingSubscriptionFunction: true, getFallbackFreePlanFunction: true, id: true, listPendingUsageSyncFunction: true, markUsageSyncedFunction: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, recordDisputeFunction: true, recordRefundFunction: true, schemaId: true, subscriptionsTableId: true, sweepOverdueSubscriptionsFunction: true, upsertBillingCustomerFunction: true, upsertBillingPriceFunction: true, upsertBillingProductFunction: true, upsertBillingSubscriptionFunction: true, upsertInvoiceFunction: true } },
});
```

### Create a billingProviderModule

```typescript
const { mutate } = useCreateBillingProviderModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingDisputesTableId: '<UUID>', billingDisputesTableName: '<String>', billingInvoicesTableId: '<UUID>', billingInvoicesTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingRefundsTableId: '<UUID>', billingRefundsTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', databaseId: '<UUID>', getActivePlanPricingFunction: '<String>', getBillingCustomerFunction: '<String>', getBillingPriceFunction: '<String>', getBillingProductFunction: '<String>', getBillingSubscriptionFunction: '<String>', getFallbackFreePlanFunction: '<String>', listPendingUsageSyncFunction: '<String>', markUsageSyncedFunction: '<String>', prefix: '<String>', pricesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', processBillingEventFunction: '<String>', productsTableId: '<UUID>', provider: '<String>', recordDisputeFunction: '<String>', recordRefundFunction: '<String>', schemaId: '<UUID>', subscriptionsTableId: '<UUID>', sweepOverdueSubscriptionsFunction: '<String>', upsertBillingCustomerFunction: '<String>', upsertBillingPriceFunction: '<String>', upsertBillingProductFunction: '<String>', upsertBillingSubscriptionFunction: '<String>', upsertInvoiceFunction: '<String>' });
```
