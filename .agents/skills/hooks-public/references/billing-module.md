# billingModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for BillingModule data operations

## Usage

```typescript
useBillingModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, recordUsageFunction: true, prefix: true } } })
useBillingModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, recordUsageFunction: true, prefix: true } } })
useCreateBillingModuleMutation({ selection: { fields: { id: true } } })
useUpdateBillingModuleMutation({ selection: { fields: { id: true } } })
useDeleteBillingModuleMutation({})
```

## Examples

### List all billingModules

```typescript
const { data, isLoading } = useBillingModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, recordUsageFunction: true, prefix: true } },
});
```

### Create a billingModule

```typescript
const { mutate } = useCreateBillingModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', recordUsageFunction: '<String>', prefix: '<String>' });
```
