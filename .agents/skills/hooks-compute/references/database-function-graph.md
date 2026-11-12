# databaseFunctionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
useDatabaseFunctionGraphsQuery({ selection: { fields: { context: true, createdAt: true, createdBy: true, databaseId: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, storeId: true, updatedAt: true, validationErrors: true } } })
useDatabaseFunctionGraphQuery({ id: '<UUID>', selection: { fields: { context: true, createdAt: true, createdBy: true, databaseId: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, storeId: true, updatedAt: true, validationErrors: true } } })
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
