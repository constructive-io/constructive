# orgChartEdge

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Organizational chart edges defining parent-child reporting relationships between members within an entity

## Usage

```typescript
useOrgChartEdgesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true, positionTitleTrgmSimilarity: true, searchScore: true } } })
useOrgChartEdgeQuery({ id: '<value>', selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true, positionTitleTrgmSimilarity: true, searchScore: true } } })
useCreateOrgChartEdgeMutation({ selection: { fields: { id: true } } })
useUpdateOrgChartEdgeMutation({ selection: { fields: { id: true } } })
useDeleteOrgChartEdgeMutation({})
```

## Examples

### List all orgChartEdges

```typescript
const { data, isLoading } = useOrgChartEdgesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true, positionTitleTrgmSimilarity: true, searchScore: true } },
});
```

### Create a orgChartEdge

```typescript
const { mutate } = useCreateOrgChartEdgeMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<value>', childId: '<value>', parentId: '<value>', positionTitle: '<value>', positionLevel: '<value>', positionTitleTrgmSimilarity: '<value>', searchScore: '<value>' });
```
