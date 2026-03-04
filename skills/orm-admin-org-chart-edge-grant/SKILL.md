---
name: orm-admin-org-chart-edge-grant
description: Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table
---

# orm-admin-org-chart-edge-grant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table

## Usage

```typescript
db.orgChartEdgeGrant.findMany({ select: { id: true } }).execute()
db.orgChartEdgeGrant.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgChartEdgeGrant.create({ data: { entityId: '<value>', childId: '<value>', parentId: '<value>', grantorId: '<value>', isGrant: '<value>', positionTitle: '<value>', positionLevel: '<value>' }, select: { id: true } }).execute()
db.orgChartEdgeGrant.update({ where: { id: '<value>' }, data: { entityId: '<new>' }, select: { id: true } }).execute()
db.orgChartEdgeGrant.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgChartEdgeGrant records

```typescript
const items = await db.orgChartEdgeGrant.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a orgChartEdgeGrant

```typescript
const item = await db.orgChartEdgeGrant.create({
  data: { entityId: 'value', childId: 'value', parentId: 'value', grantorId: 'value', isGrant: 'value', positionTitle: 'value', positionLevel: 'value' },
  select: { id: true }
}).execute();
```
