# spatialRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SpatialRelation data operations

## Usage

```typescript
useSpatialRelationsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, refTableId: true, refFieldId: true, name: true, operator: true, paramName: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useSpatialRelationQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, refTableId: true, refFieldId: true, name: true, operator: true, paramName: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateSpatialRelationMutation({ selection: { fields: { id: true } } })
useUpdateSpatialRelationMutation({ selection: { fields: { id: true } } })
useDeleteSpatialRelationMutation({})
```

## Examples

### List all spatialRelations

```typescript
const { data, isLoading } = useSpatialRelationsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, refTableId: true, refFieldId: true, name: true, operator: true, paramName: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a spatialRelation

```typescript
const { mutate } = useCreateSpatialRelationMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
