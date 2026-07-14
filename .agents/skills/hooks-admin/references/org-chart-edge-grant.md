# orgChartEdgeGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table

## Usage

```typescript
useOrgChartEdgeGrantsQuery({ selection: { fields: { childId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, parentId: true, positionLevel: true, positionTitle: true } } })
useOrgChartEdgeGrantQuery({ id: '<UUID>', selection: { fields: { childId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, parentId: true, positionLevel: true, positionTitle: true } } })
useCreateOrgChartEdgeGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgChartEdgeGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgChartEdgeGrantMutation({})
```

## Examples

### List all orgChartEdgeGrants

```typescript
const { data, isLoading } = useOrgChartEdgeGrantsQuery({
  selection: { fields: { childId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, parentId: true, positionLevel: true, positionTitle: true } },
});
```

### Create a orgChartEdgeGrant

```typescript
const { mutate } = useCreateOrgChartEdgeGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ childId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', parentId: '<UUID>', positionLevel: '<Int>', positionTitle: '<String>' });
```
