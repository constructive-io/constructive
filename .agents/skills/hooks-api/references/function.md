# function

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Function data operations

## Usage

```typescript
useFunctionsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true } } })
useFunctionQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true } } })
useCreateFunctionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionMutation({})
```

## Examples

### List all functions

```typescript
const { data, isLoading } = useFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true } },
});
```

### Create a function

```typescript
const { mutate } = useCreateFunctionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>' });
```
