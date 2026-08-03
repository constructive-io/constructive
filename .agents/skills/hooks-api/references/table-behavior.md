# tableBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TableBehavior data operations

## Usage

```typescript
useTableBehaviorsQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, tableId: true, updatedAt: true } } })
useTableBehaviorQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, tableId: true, updatedAt: true } } })
useCreateTableBehaviorMutation({ selection: { fields: { id: true } } })
useUpdateTableBehaviorMutation({ selection: { fields: { id: true } } })
useDeleteTableBehaviorMutation({})
```

## Examples

### List all tableBehaviors

```typescript
const { data, isLoading } = useTableBehaviorsQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, tableId: true, updatedAt: true } },
});
```

### Create a tableBehavior

```typescript
const { mutate } = useCreateTableBehaviorMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', tableId: '<UUID>' });
```
