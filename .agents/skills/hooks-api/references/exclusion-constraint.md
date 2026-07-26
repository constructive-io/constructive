# exclusionConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ExclusionConstraint data operations

## Usage

```typescript
useExclusionConstraintsQuery({ selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, elementExpr: true, fieldIds: true, id: true, name: true, operators: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, whereClause: true } } })
useExclusionConstraintQuery({ id: '<UUID>', selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, elementExpr: true, fieldIds: true, id: true, name: true, operators: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, whereClause: true } } })
useCreateExclusionConstraintMutation({ selection: { fields: { id: true } } })
useUpdateExclusionConstraintMutation({ selection: { fields: { id: true } } })
useDeleteExclusionConstraintMutation({})
```

## Examples

### List all exclusionConstraints

```typescript
const { data, isLoading } = useExclusionConstraintsQuery({
  selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, elementExpr: true, fieldIds: true, id: true, name: true, operators: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, whereClause: true } },
});
```

### Create a exclusionConstraint

```typescript
const { mutate } = useCreateExclusionConstraintMutation({
  selection: { fields: { id: true } },
});
mutate({ accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', elementExpr: '<JSON>', fieldIds: '<UUID>', name: '<String>', operators: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', whereClause: '<JSON>' });
```
