# orgLimitCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default.

## Usage

```typescript
db.orgLimitCap.findMany({ select: { id: true } }).execute()
db.orgLimitCap.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitCap.create({ data: { entityId: '<UUID>', max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute()
db.orgLimitCap.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgLimitCap.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitCap records

```typescript
const items = await db.orgLimitCap.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a orgLimitCap

```typescript
const item = await db.orgLimitCap.create({
  data: { entityId: '<UUID>', max: '<BigInt>', name: '<String>' },
  select: { id: true }
}).execute();
```
