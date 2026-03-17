# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LimitsModule data operations

## Usage

```typescript
useLimitsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true, tableNameTrgmSimilarity: true, defaultTableNameTrgmSimilarity: true, limitIncrementFunctionTrgmSimilarity: true, limitDecrementFunctionTrgmSimilarity: true, limitIncrementTriggerTrgmSimilarity: true, limitDecrementTriggerTrgmSimilarity: true, limitUpdateTriggerTrgmSimilarity: true, limitCheckFunctionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } } })
useLimitsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true, tableNameTrgmSimilarity: true, defaultTableNameTrgmSimilarity: true, limitIncrementFunctionTrgmSimilarity: true, limitDecrementFunctionTrgmSimilarity: true, limitIncrementTriggerTrgmSimilarity: true, limitDecrementTriggerTrgmSimilarity: true, limitUpdateTriggerTrgmSimilarity: true, limitCheckFunctionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } } })
useCreateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteLimitsModuleMutation({})
```

## Examples

### List all limitsModules

```typescript
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true, tableNameTrgmSimilarity: true, defaultTableNameTrgmSimilarity: true, limitIncrementFunctionTrgmSimilarity: true, limitDecrementFunctionTrgmSimilarity: true, limitIncrementTriggerTrgmSimilarity: true, limitDecrementTriggerTrgmSimilarity: true, limitUpdateTriggerTrgmSimilarity: true, limitCheckFunctionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});
```

### Create a limitsModule

```typescript
const { mutate } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', limitIncrementFunction: '<value>', limitDecrementFunction: '<value>', limitIncrementTrigger: '<value>', limitDecrementTrigger: '<value>', limitUpdateTrigger: '<value>', limitCheckFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', tableNameTrgmSimilarity: '<value>', defaultTableNameTrgmSimilarity: '<value>', limitIncrementFunctionTrgmSimilarity: '<value>', limitDecrementFunctionTrgmSimilarity: '<value>', limitIncrementTriggerTrgmSimilarity: '<value>', limitDecrementTriggerTrgmSimilarity: '<value>', limitUpdateTriggerTrgmSimilarity: '<value>', limitCheckFunctionTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```
