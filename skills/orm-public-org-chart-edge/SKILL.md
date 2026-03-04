---
name: orm-public-org-chart-edge
description: Organizational chart edges defining parent-child reporting relationships between members within an entity
---

# orm-public-org-chart-edge

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Organizational chart edges defining parent-child reporting relationships between members within an entity

## Usage

```typescript
db.orgChartEdge.findMany({ select: { id: true } }).execute()
db.orgChartEdge.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgChartEdge.create({ data: { entityId: '<value>', childId: '<value>', parentId: '<value>', positionTitle: '<value>', positionLevel: '<value>' }, select: { id: true } }).execute()
db.orgChartEdge.update({ where: { id: '<value>' }, data: { entityId: '<new>' }, select: { id: true } }).execute()
db.orgChartEdge.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgChartEdge records

```typescript
const items = await db.orgChartEdge.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a orgChartEdge

```typescript
const item = await db.orgChartEdge.create({
  data: { entityId: 'value', childId: 'value', parentId: 'value', positionTitle: 'value', positionLevel: 'value' },
  select: { id: true }
}).execute();
```
