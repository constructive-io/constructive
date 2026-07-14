# orgChartEdge

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Organizational chart edges defining parent-child reporting relationships between members within an entity

## Usage

```typescript
useOrgChartEdgesQuery({ selection: { fields: { childId: true, createdAt: true, entityId: true, id: true, parentId: true, positionLevel: true, positionTitle: true, updatedAt: true } } })
useOrgChartEdgeQuery({ id: '<UUID>', selection: { fields: { childId: true, createdAt: true, entityId: true, id: true, parentId: true, positionLevel: true, positionTitle: true, updatedAt: true } } })
useCreateOrgChartEdgeMutation({ selection: { fields: { id: true } } })
useUpdateOrgChartEdgeMutation({ selection: { fields: { id: true } } })
useDeleteOrgChartEdgeMutation({})
```

## Examples

### List all orgChartEdges

```typescript
const { data, isLoading } = useOrgChartEdgesQuery({
  selection: { fields: { childId: true, createdAt: true, entityId: true, id: true, parentId: true, positionLevel: true, positionTitle: true, updatedAt: true } },
});
```

### Create a orgChartEdge

```typescript
const { mutate } = useCreateOrgChartEdgeMutation({
  selection: { fields: { id: true } },
});
mutate({ childId: '<UUID>', entityId: '<UUID>', parentId: '<UUID>', positionLevel: '<Int>', positionTitle: '<String>' });
```
