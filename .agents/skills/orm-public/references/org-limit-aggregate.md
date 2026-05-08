# orgLimitAggregate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown)

## Usage

```typescript
db.orgLimitAggregate.findMany({ select: { id: true } }).execute()
db.orgLimitAggregate.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitAggregate.create({ data: { name: '<String>', entityId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', reserved: '<BigInt>' }, select: { id: true } }).execute()
db.orgLimitAggregate.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.orgLimitAggregate.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitAggregate records

```typescript
const items = await db.orgLimitAggregate.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a orgLimitAggregate

```typescript
const item = await db.orgLimitAggregate.create({
  data: { name: '<String>', entityId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', reserved: '<BigInt>' },
  select: { id: true }
}).execute();
```
