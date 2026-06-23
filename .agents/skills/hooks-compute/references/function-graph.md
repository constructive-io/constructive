# functionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
useFunctionGraphsQuery({ selection: { fields: { id: true, databaseId: true, storeId: true, entityId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } } })
useFunctionGraphQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, storeId: true, entityId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } } })
useCreateFunctionGraphMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphMutation({})
```

## Examples

### List all functionGraphs

```typescript
const { data, isLoading } = useFunctionGraphsQuery({
  selection: { fields: { id: true, databaseId: true, storeId: true, entityId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } },
});
```

### Create a functionGraph

```typescript
const { mutate } = useCreateFunctionGraphMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', storeId: '<UUID>', entityId: '<UUID>', context: '<String>', name: '<String>', description: '<String>', definitionsCommitId: '<UUID>', isValid: '<Boolean>', validationErrors: '<JSON>', createdBy: '<UUID>' });
```
