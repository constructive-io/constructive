# hooks-limitFunction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LimitFunction data operations

## Usage

```typescript
useLimitFunctionsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, data: true, security: true } } })
useLimitFunctionQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, data: true, security: true } } })
useCreateLimitFunctionMutation({ selection: { fields: { id: true } } })
useUpdateLimitFunctionMutation({ selection: { fields: { id: true } } })
useDeleteLimitFunctionMutation({})
```

## Examples

### List all limitFunctions

```typescript
const { data, isLoading } = useLimitFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, data: true, security: true } },
});
```

### Create a limitFunction

```typescript
const { mutate } = useCreateLimitFunctionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', data: '<value>', security: '<value>' });
```
