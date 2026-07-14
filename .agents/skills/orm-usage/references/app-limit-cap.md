# appLimitCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default.

## Usage

```typescript
db.appLimitCap.findMany({ select: { id: true } }).execute()
db.appLimitCap.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitCap.create({ data: { entityId: '<UUID>', max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute()
db.appLimitCap.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.appLimitCap.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitCap records

```typescript
const items = await db.appLimitCap.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a appLimitCap

```typescript
const item = await db.appLimitCap.create({
  data: { entityId: '<UUID>', max: '<BigInt>', name: '<String>' },
  select: { id: true }
}).execute();
```
