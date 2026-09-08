# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Trigger data operations

## Usage

```typescript
useTriggersQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, events: true, forEachRow: true, functionId: true, functionName: true, id: true, kind: true, name: true, smartTags: true, tableId: true, tags: true, timing: true, updatedAt: true, whenAst: true } } })
useTriggerQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, events: true, forEachRow: true, functionId: true, functionName: true, id: true, kind: true, name: true, smartTags: true, tableId: true, tags: true, timing: true, updatedAt: true, whenAst: true } } })
useCreateTriggerMutation({ selection: { fields: { id: true } } })
useUpdateTriggerMutation({ selection: { fields: { id: true } } })
useDeleteTriggerMutation({})
```

## Examples

### List all triggers

```typescript
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, events: true, forEachRow: true, functionId: true, functionName: true, id: true, kind: true, name: true, smartTags: true, tableId: true, tags: true, timing: true, updatedAt: true, whenAst: true } },
});
```

### Create a trigger

```typescript
const { mutate } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', event: '<String>', events: '<String>', forEachRow: '<Boolean>', functionId: '<UUID>', functionName: '<String>', kind: '<String>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', timing: '<String>', whenAst: '<JSON>' });
```
