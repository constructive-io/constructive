# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LimitsModule data operations

## Usage

```typescript
useLimitsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
useLimitsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
useCreateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteLimitsModuleMutation({})
```

## Examples

### List all limitsModules

```typescript
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});
```

### Create a limitsModule

```typescript
const { mutate } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', limitCreditsTableId: '<UUID>', eventsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditCodeItemsTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', aggregateTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCapsDefaultsTableId: '<UUID>', capCheckTrigger: '<String>', resolveCapFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' });
```
