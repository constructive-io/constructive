# uniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UniqueConstraint data operations

## Usage

```typescript
useUniqueConstraintsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useUniqueConstraintQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateUniqueConstraintMutation({ selection: { fields: { id: true } } })
useUpdateUniqueConstraintMutation({ selection: { fields: { id: true } } })
useDeleteUniqueConstraintMutation({})
```

## Examples

### List all uniqueConstraints

```typescript
const { data, isLoading } = useUniqueConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a uniqueConstraint

```typescript
const { mutate } = useCreateUniqueConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
