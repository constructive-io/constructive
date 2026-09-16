# databaseFunctionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
useDatabaseFunctionGraphsQuery({ selection: { fields: { context: true, createdAt: true, createdBy: true, databaseId: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, storeId: true, updatedAt: true, validationErrors: true } } })
useDatabaseFunctionGraphQuery({ id: '<UUID>', selection: { fields: { context: true, createdAt: true, createdBy: true, databaseId: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, storeId: true, updatedAt: true, validationErrors: true } } })
useCreateDatabaseFunctionGraphMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseFunctionGraphMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseFunctionGraphMutation({})
```

## Examples

### List all databaseFunctionGraphs

```typescript
const { data, isLoading } = useDatabaseFunctionGraphsQuery({
  selection: { fields: { context: true, createdAt: true, createdBy: true, databaseId: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, storeId: true, updatedAt: true, validationErrors: true } },
});
```

### Create a databaseFunctionGraph

```typescript
const { mutate } = useCreateDatabaseFunctionGraphMutation({
  selection: { fields: { id: true } },
});
mutate({ context: '<String>', createdBy: '<UUID>', databaseId: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', storeId: '<UUID>', validationErrors: '<JSON>' });
```
