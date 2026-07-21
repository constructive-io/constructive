# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LimitsModule data operations

## Usage

```typescript
useLimitsModulesQuery({ selection: { fields: { actorTableId: true, aggregateTableId: true, apiName: true, capCheckTrigger: true, creditCodeItemsTableId: true, creditCodesTableId: true, creditRedemptionsTableId: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, eventsTableId: true, id: true, limitAggregateCheckSoftFunction: true, limitCapsDefaultsTableId: true, limitCapsTableId: true, limitCheckFunction: true, limitCheckSoftFunction: true, limitCreditsTableId: true, limitDecrementFunction: true, limitDecrementTrigger: true, limitIncrementFunction: true, limitIncrementTrigger: true, limitUpdateTrigger: true, limitWarningStateTableId: true, limitWarningsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, resolveCapFunction: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useLimitsModuleQuery({ id: '<UUID>', selection: { fields: { actorTableId: true, aggregateTableId: true, apiName: true, capCheckTrigger: true, creditCodeItemsTableId: true, creditCodesTableId: true, creditRedemptionsTableId: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, eventsTableId: true, id: true, limitAggregateCheckSoftFunction: true, limitCapsDefaultsTableId: true, limitCapsTableId: true, limitCheckFunction: true, limitCheckSoftFunction: true, limitCreditsTableId: true, limitDecrementFunction: true, limitDecrementTrigger: true, limitIncrementFunction: true, limitIncrementTrigger: true, limitUpdateTrigger: true, limitWarningStateTableId: true, limitWarningsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, resolveCapFunction: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCreateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteLimitsModuleMutation({})
```

## Examples

### List all limitsModules

```typescript
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { actorTableId: true, aggregateTableId: true, apiName: true, capCheckTrigger: true, creditCodeItemsTableId: true, creditCodesTableId: true, creditRedemptionsTableId: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, eventsTableId: true, id: true, limitAggregateCheckSoftFunction: true, limitCapsDefaultsTableId: true, limitCapsTableId: true, limitCheckFunction: true, limitCheckSoftFunction: true, limitCreditsTableId: true, limitDecrementFunction: true, limitDecrementTrigger: true, limitIncrementFunction: true, limitIncrementTrigger: true, limitUpdateTrigger: true, limitWarningStateTableId: true, limitWarningsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, resolveCapFunction: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});
```

### Create a limitsModule

```typescript
const { mutate } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorTableId: '<UUID>', aggregateTableId: '<UUID>', apiName: '<String>', capCheckTrigger: '<String>', creditCodeItemsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventsTableId: '<UUID>', limitAggregateCheckSoftFunction: '<String>', limitCapsDefaultsTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCheckFunction: '<String>', limitCheckSoftFunction: '<String>', limitCreditsTableId: '<UUID>', limitDecrementFunction: '<String>', limitDecrementTrigger: '<String>', limitIncrementFunction: '<String>', limitIncrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitWarningStateTableId: '<UUID>', limitWarningsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', resolveCapFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```
