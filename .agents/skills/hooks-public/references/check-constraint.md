# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CheckConstraint data operations

## Usage

```typescript
useCheckConstraintsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCheckConstraintQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateCheckConstraintMutation({ selection: { fields: { id: true } } })
useUpdateCheckConstraintMutation({ selection: { fields: { id: true } } })
useDeleteCheckConstraintMutation({})
```

## Examples

### List all checkConstraints

```typescript
const { data, isLoading } = useCheckConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a checkConstraint

```typescript
const { mutate } = useCreateCheckConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', expr: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
