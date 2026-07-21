# primaryKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PrimaryKeyConstraint data operations

## Usage

```typescript
usePrimaryKeyConstraintsQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
usePrimaryKeyConstraintQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
useCreatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } })
useUpdatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } })
useDeletePrimaryKeyConstraintMutation({})
```

## Examples

### List all primaryKeyConstraints

```typescript
const { data, isLoading } = usePrimaryKeyConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});
```

### Create a primaryKeyConstraint

```typescript
const { mutate } = useCreatePrimaryKeyConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>' });
```
