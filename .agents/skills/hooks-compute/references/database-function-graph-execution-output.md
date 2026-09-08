# databaseFunctionGraphExecutionOutput

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed store for execution outputs — hash-referenced from node_outputs

## Usage

```typescript
useDatabaseFunctionGraphExecutionOutputsQuery({ selection: { fields: { createdAt: true, data: true, databaseId: true, hash: true, id: true } } })
useDatabaseFunctionGraphExecutionOutputQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, databaseId: true, hash: true, id: true } } })
useCreateDatabaseFunctionGraphExecutionOutputMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseFunctionGraphExecutionOutputMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseFunctionGraphExecutionOutputMutation({})
```

## Examples

### List all databaseFunctionGraphExecutionOutputs

```typescript
const { data, isLoading } = useDatabaseFunctionGraphExecutionOutputsQuery({
  selection: { fields: { createdAt: true, data: true, databaseId: true, hash: true, id: true } },
});
```

### Create a databaseFunctionGraphExecutionOutput

```typescript
const { mutate } = useCreateDatabaseFunctionGraphExecutionOutputMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', databaseId: '<UUID>', hash: '<Base64EncodedBinary>' });
```
