# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Trigger data operations

## Usage

```typescript
useTriggersQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, eventTrgmSimilarity: true, functionNameTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } } })
useTriggerQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, eventTrgmSimilarity: true, functionNameTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } } })
useCreateTriggerMutation({ selection: { fields: { id: true } } })
useUpdateTriggerMutation({ selection: { fields: { id: true } } })
useDeleteTriggerMutation({})
```

## Examples

### List all triggers

```typescript
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, eventTrgmSimilarity: true, functionNameTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});
```

### Create a trigger

```typescript
const { mutate } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', tableId: '<value>', name: '<value>', event: '<value>', functionName: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', eventTrgmSimilarity: '<value>', functionNameTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```
