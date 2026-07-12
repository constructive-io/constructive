# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LimitsModule data operations

## Usage

```typescript
useLimitsModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, apiName: true, privateApiName: true } } })
useLimitsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, apiName: true, privateApiName: true } } })
useCreateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteLimitsModuleMutation({})
```

## Examples

### List all limitsModules

```typescript
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, apiName: true, privateApiName: true } },
});
```

### Create a limitsModule

```typescript
const { mutate } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', limitCreditsTableId: '<UUID>', eventsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditCodeItemsTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', aggregateTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCapsDefaultsTableId: '<UUID>', capCheckTrigger: '<String>', resolveCapFunction: '<String>', limitWarningsTableId: '<UUID>', limitWarningStateTableId: '<UUID>', limitCheckSoftFunction: '<String>', limitAggregateCheckSoftFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```
