# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Trigger data operations

## Usage

```typescript
useTriggersQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useTriggerQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateTriggerMutation({ selection: { fields: { id: true } } })
useUpdateTriggerMutation({ selection: { fields: { id: true } } })
useDeleteTriggerMutation({})
```

## Examples

### List all triggers

```typescript
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a trigger

```typescript
const { mutate } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', event: '<String>', functionName: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
