# hooks-foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ForeignKeyConstraint data operations

## Usage

```typescript
useForeignKeyConstraintsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useForeignKeyConstraintQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
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
mutate({ databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', refTableId: '<value>', refFieldIds: '<value>', deleteAction: '<value>', updateAction: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```
