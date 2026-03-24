# orgChartEdge

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Organizational chart edges defining parent-child reporting relationships between members within an entity

## Usage

```typescript
db.orgChartEdge.findMany({ select: { id: true } }).execute()
db.orgChartEdge.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgChartEdge.create({ data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', positionTitle: '<String>', positionLevel: '<Int>' }, select: { id: true } }).execute()
db.orgChartEdge.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgChartEdge.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', positionTitle: '<String>', positionLevel: '<Int>' },
  select: { id: true }
}).execute();
```
