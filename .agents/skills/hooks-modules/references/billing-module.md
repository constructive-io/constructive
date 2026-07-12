# billingModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for BillingModule data operations

## Usage

```typescript
useBillingModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, recordUsageFunction: true, sweepExpiredSubscriptionsFunction: true, rollupUsageSummaryFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useBillingModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, recordUsageFunction: true, sweepExpiredSubscriptionsFunction: true, rollupUsageSummaryFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useCreateBillingModuleMutation({ selection: { fields: { id: true } } })
useUpdateBillingModuleMutation({ selection: { fields: { id: true } } })
useDeleteBillingModuleMutation({})
```

## Examples

### List all billingModules

```typescript
const { data, isLoading } = useBillingModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, recordUsageFunction: true, sweepExpiredSubscriptionsFunction: true, rollupUsageSummaryFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});
```

### Create a billingModule

```typescript
const { mutate } = useCreateBillingModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', recordUsageFunction: '<String>', sweepExpiredSubscriptionsFunction: '<String>', rollupUsageSummaryFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
