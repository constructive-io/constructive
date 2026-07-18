# functionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
useFunctionGraphsQuery({ selection: { fields: { context: true, createdAt: true, createdBy: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, scopeId: true, storeId: true, updatedAt: true, validationErrors: true } } })
useFunctionGraphQuery({ id: '<UUID>', selection: { fields: { context: true, createdAt: true, createdBy: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, scopeId: true, storeId: true, updatedAt: true, validationErrors: true } } })
useCreateFunctionGraphMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphMutation({})
```

## Examples

### List all functionGraphs

```typescript
const { data, isLoading } = useFunctionGraphsQuery({
  selection: { fields: { context: true, createdAt: true, createdBy: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, scopeId: true, storeId: true, updatedAt: true, validationErrors: true } },
});
```

### Create a functionGraph

```typescript
const { mutate } = useCreateFunctionGraphMutation({
  selection: { fields: { id: true } },
});
mutate({ context: '<String>', createdBy: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', validationErrors: '<JSON>' });
```
