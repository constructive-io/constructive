# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Trigger data operations

## Usage

```typescript
useTriggersQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, events: true, forEach: true, functionName: true, id: true, name: true, smartTags: true, tableId: true, tags: true, timing: true, transitionNewName: true, transitionOldName: true, updatedAt: true, whenClause: true } } })
useTriggerQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, events: true, forEach: true, functionName: true, id: true, name: true, smartTags: true, tableId: true, tags: true, timing: true, transitionNewName: true, transitionOldName: true, updatedAt: true, whenClause: true } } })
useCreateTriggerMutation({ selection: { fields: { id: true } } })
useUpdateTriggerMutation({ selection: { fields: { id: true } } })
useDeleteTriggerMutation({})
```

## Examples

### List all triggers

```typescript
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, events: true, forEach: true, functionName: true, id: true, name: true, smartTags: true, tableId: true, tags: true, timing: true, transitionNewName: true, transitionOldName: true, updatedAt: true, whenClause: true } },
});
```

### Create a trigger

```typescript
const { mutate } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', event: '<String>', events: '<String>', forEach: '<String>', functionName: '<String>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', timing: '<String>', transitionNewName: '<String>', transitionOldName: '<String>', whenClause: '<JSON>' });
```
