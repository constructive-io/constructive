---
name: hooks-public-org-chart-edge-grant
description: Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table
---

# hooks-public-org-chart-edge-grant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table

## Usage

```typescript
useOrgChartEdgeGrantsQuery({ selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } } })
useOrgChartEdgeGrantQuery({ id: '<value>', selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } } })
useCreateOrgChartEdgeGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgChartEdgeGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgChartEdgeGrantMutation({})
```

## Examples

### List all orgChartEdgeGrants

```typescript
const { data, isLoading } = useOrgChartEdgeGrantsQuery({
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } },
});
```

### Create a orgChartEdgeGrant

```typescript
const { mutate } = useCreateOrgChartEdgeGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<value>', childId: '<value>', parentId: '<value>', grantorId: '<value>', isGrant: '<value>', positionTitle: '<value>', positionLevel: '<value>' });
```
