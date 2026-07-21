# spatialRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SpatialRelation data operations

## Usage

```typescript
useSpatialRelationsQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, fieldId: true, id: true, name: true, operator: true, paramName: true, refFieldId: true, refTableId: true, tableId: true, tags: true, updatedAt: true } } })
useSpatialRelationQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, fieldId: true, id: true, name: true, operator: true, paramName: true, refFieldId: true, refTableId: true, tableId: true, tags: true, updatedAt: true } } })
useCreateSpatialRelationMutation({ selection: { fields: { id: true } } })
useUpdateSpatialRelationMutation({ selection: { fields: { id: true } } })
useDeleteSpatialRelationMutation({})
```

## Examples

### List all spatialRelations

```typescript
const { data, isLoading } = useSpatialRelationsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, fieldId: true, id: true, name: true, operator: true, paramName: true, refFieldId: true, refTableId: true, tableId: true, tags: true, updatedAt: true } },
});
```

### Create a spatialRelation

```typescript
const { mutate } = useCreateSpatialRelationMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', fieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', refFieldId: '<UUID>', refTableId: '<UUID>', tableId: '<UUID>', tags: '<String>' });
```
