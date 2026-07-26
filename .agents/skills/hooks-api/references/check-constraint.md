# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CheckConstraint data operations

## Usage

```typescript
useCheckConstraintsQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, expr: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
useCheckConstraintQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, expr: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
useCreateCheckConstraintMutation({ selection: { fields: { id: true } } })
useUpdateCheckConstraintMutation({ selection: { fields: { id: true } } })
useDeleteCheckConstraintMutation({})
```

## Examples

### List all checkConstraints

```typescript
const { data, isLoading } = useCheckConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, expr: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});
```

### Create a checkConstraint

```typescript
const { mutate } = useCreateCheckConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', expr: '<JSON>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>' });
```
