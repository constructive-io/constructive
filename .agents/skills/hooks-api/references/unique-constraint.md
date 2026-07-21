# uniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UniqueConstraint data operations

## Usage

```typescript
useUniqueConstraintsQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, fieldIds: true, id: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
useUniqueConstraintQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, fieldIds: true, id: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
useCreateUniqueConstraintMutation({ selection: { fields: { id: true } } })
useUpdateUniqueConstraintMutation({ selection: { fields: { id: true } } })
useDeleteUniqueConstraintMutation({})
```

## Examples

### List all uniqueConstraints

```typescript
const { data, isLoading } = useUniqueConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, fieldIds: true, id: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});
```

### Create a uniqueConstraint

```typescript
const { mutate } = useCreateUniqueConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', fieldIds: '<UUID>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>' });
```
