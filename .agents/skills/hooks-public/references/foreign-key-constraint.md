# foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ForeignKeyConstraint data operations

## Usage

```typescript
useForeignKeyConstraintsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useForeignKeyConstraintQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateForeignKeyConstraintMutation({ selection: { fields: { id: true } } })
useUpdateForeignKeyConstraintMutation({ selection: { fields: { id: true } } })
useDeleteForeignKeyConstraintMutation({})
```

## Examples

### List all foreignKeyConstraints

```typescript
const { data, isLoading } = useForeignKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a foreignKeyConstraint

```typescript
const { mutate } = useCreateForeignKeyConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', refTableId: '<UUID>', refFieldIds: '<UUID>', deleteAction: '<String>', updateAction: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
