# primaryKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PrimaryKeyConstraint data operations

## Usage

```typescript
usePrimaryKeyConstraintsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
usePrimaryKeyConstraintQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } })
useUpdatePrimaryKeyConstraintMutation({ selection: { fields: { id: true } } })
useDeletePrimaryKeyConstraintMutation({})
```

## Examples

### List all primaryKeyConstraints

```typescript
const { data, isLoading } = usePrimaryKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a primaryKeyConstraint

```typescript
const { mutate } = useCreatePrimaryKeyConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
