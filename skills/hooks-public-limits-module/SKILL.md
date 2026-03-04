---
name: hooks-public-limits-module
description: React Query hooks for LimitsModule data operations
---

# hooks-public-limits-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LimitsModule data operations

## Usage

```typescript
useLimitsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
useLimitsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
useCreateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteLimitsModuleMutation({})
```

## Examples

### List all limitsModules

```typescript
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});
```

### Create a limitsModule

```typescript
const { mutate } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', limitIncrementFunction: '<value>', limitDecrementFunction: '<value>', limitIncrementTrigger: '<value>', limitDecrementTrigger: '<value>', limitUpdateTrigger: '<value>', limitCheckFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' });
```
