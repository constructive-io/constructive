# orgChartEdgeGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table

## Usage

```typescript
db.orgChartEdgeGrant.findMany({ select: { id: true } }).execute()
db.orgChartEdgeGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgChartEdgeGrant.create({ data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', positionTitle: '<String>', positionLevel: '<Int>' }, select: { id: true } }).execute()
db.orgChartEdgeGrant.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgChartEdgeGrant.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', positionTitle: '<String>', positionLevel: '<Int>' },
  select: { id: true }
}).execute();
```
