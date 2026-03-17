# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CheckConstraint data operations

## Usage

```typescript
useCheckConstraintsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } } })
useCheckConstraintQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } } })
useCreateCheckConstraintMutation({ selection: { fields: { id: true } } })
useUpdateCheckConstraintMutation({ selection: { fields: { id: true } } })
useDeleteCheckConstraintMutation({})
```

## Examples

### List all checkConstraints

```typescript
const { data, isLoading } = useCheckConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});
```

### Create a checkConstraint

```typescript
const { mutate } = useCreateCheckConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', expr: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', typeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```
