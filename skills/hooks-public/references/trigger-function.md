# triggerFunction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TriggerFunction data operations

## Usage

```typescript
useTriggerFunctionsQuery({ selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, codeTrgmSimilarity: true, searchScore: true } } })
useTriggerFunctionQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, codeTrgmSimilarity: true, searchScore: true } } })
useCreateTriggerFunctionMutation({ selection: { fields: { id: true } } })
useUpdateTriggerFunctionMutation({ selection: { fields: { id: true } } })
useDeleteTriggerFunctionMutation({})
```

## Examples

### List all triggerFunctions

```typescript
const { data, isLoading } = useTriggerFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, codeTrgmSimilarity: true, searchScore: true } },
});
```

### Create a triggerFunction

```typescript
const { mutate } = useCreateTriggerFunctionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', name: '<value>', code: '<value>', nameTrgmSimilarity: '<value>', codeTrgmSimilarity: '<value>', searchScore: '<value>' });
```
