# billingProviderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for BillingProviderModule data operations

## Usage

```typescript
useBillingProviderModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true } } })
useBillingProviderModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true } } })
useCreateBillingProviderModuleMutation({ selection: { fields: { id: true } } })
useUpdateBillingProviderModuleMutation({ selection: { fields: { id: true } } })
useDeleteBillingProviderModuleMutation({})
```

## Examples

### List all billingProviderModules

```typescript
const { data, isLoading } = useBillingProviderModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true } },
});
```

### Create a billingProviderModule

```typescript
const { mutate } = useCreateBillingProviderModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', provider: '<String>', productsTableId: '<UUID>', pricesTableId: '<UUID>', subscriptionsTableId: '<UUID>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', processBillingEventFunction: '<String>', prefix: '<String>' });
```
