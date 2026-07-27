# foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ForeignKeyConstraint data operations

## Usage

```typescript
useForeignKeyConstraintsQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, deleteAction: true, deleteSetFieldIds: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, refFieldIds: true, refTableId: true, smartTags: true, tableId: true, tags: true, type: true, updateAction: true, updatedAt: true, withPeriod: true } } })
useForeignKeyConstraintQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, deleteAction: true, deleteSetFieldIds: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, refFieldIds: true, refTableId: true, smartTags: true, tableId: true, tags: true, type: true, updateAction: true, updatedAt: true, withPeriod: true } } })
useCreateForeignKeyConstraintMutation({ selection: { fields: { id: true } } })
useUpdateForeignKeyConstraintMutation({ selection: { fields: { id: true } } })
useDeleteForeignKeyConstraintMutation({})
```

## Examples

### List all foreignKeyConstraints

```typescript
const { data, isLoading } = useForeignKeyConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, deleteAction: true, deleteSetFieldIds: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, refFieldIds: true, refTableId: true, smartTags: true, tableId: true, tags: true, type: true, updateAction: true, updatedAt: true, withPeriod: true } },
});
```

### Create a foreignKeyConstraint

```typescript
const { mutate } = useCreateForeignKeyConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', deleteAction: '<String>', deleteSetFieldIds: '<UUID>', description: '<String>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', refFieldIds: '<UUID>', refTableId: '<UUID>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', updateAction: '<String>', withPeriod: '<Boolean>' });
```
