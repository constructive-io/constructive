# triggerFunction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TriggerFunction data operations

## Usage

```typescript
useTriggerFunctionsQuery({ selection: { fields: { code: true, createdAt: true, databaseId: true, id: true, name: true, updatedAt: true } } })
useTriggerFunctionQuery({ id: '<UUID>', selection: { fields: { code: true, createdAt: true, databaseId: true, id: true, name: true, updatedAt: true } } })
useCreateTriggerFunctionMutation({ selection: { fields: { id: true } } })
useUpdateTriggerFunctionMutation({ selection: { fields: { id: true } } })
useDeleteTriggerFunctionMutation({})
```

## Examples

### List all triggerFunctions

```typescript
const { data, isLoading } = useTriggerFunctionsQuery({
  selection: { fields: { code: true, createdAt: true, databaseId: true, id: true, name: true, updatedAt: true } },
});
```

### Create a triggerFunction

```typescript
const { mutate } = useCreateTriggerFunctionMutation({
  selection: { fields: { id: true } },
});
mutate({ code: '<String>', databaseId: '<UUID>', name: '<String>' });
```
