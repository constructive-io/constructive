# billingModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for BillingModule data operations

## Usage

```typescript
useBillingModulesQuery({ selection: { fields: { apiName: true, balancesTableId: true, balancesTableName: true, databaseId: true, defaultPermissions: true, id: true, ledgerTableId: true, ledgerTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordUsageFunction: true, rollupUsageSummaryFunction: true, schemaId: true, sweepExpiredSubscriptionsFunction: true } } })
useBillingModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, balancesTableId: true, balancesTableName: true, databaseId: true, defaultPermissions: true, id: true, ledgerTableId: true, ledgerTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordUsageFunction: true, rollupUsageSummaryFunction: true, schemaId: true, sweepExpiredSubscriptionsFunction: true } } })
useCreateBillingModuleMutation({ selection: { fields: { id: true } } })
useUpdateBillingModuleMutation({ selection: { fields: { id: true } } })
useDeleteBillingModuleMutation({})
```

## Examples

### List all billingModules

```typescript
const { data, isLoading } = useBillingModulesQuery({
  selection: { fields: { apiName: true, balancesTableId: true, balancesTableName: true, databaseId: true, defaultPermissions: true, id: true, ledgerTableId: true, ledgerTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordUsageFunction: true, rollupUsageSummaryFunction: true, schemaId: true, sweepExpiredSubscriptionsFunction: true } },
});
```

### Create a billingModule

```typescript
const { mutate } = useCreateBillingModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordUsageFunction: '<String>', rollupUsageSummaryFunction: '<String>', schemaId: '<UUID>', sweepExpiredSubscriptionsFunction: '<String>' });
```
