# function

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Function data operations

## Usage

```typescript
useFunctionsQuery({ selection: { fields: { databaseId: true, id: true, name: true, schemaId: true } } })
useFunctionQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, name: true, schemaId: true } } })
useCreateFunctionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionMutation({})
```

## Examples

### List all functions

```typescript
const { data, isLoading } = useFunctionsQuery({
  selection: { fields: { databaseId: true, id: true, name: true, schemaId: true } },
});
```

### Create a function

```typescript
const { mutate } = useCreateFunctionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', name: '<String>', schemaId: '<UUID>' });
```
