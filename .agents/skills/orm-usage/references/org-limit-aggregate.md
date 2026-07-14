# orgLimitAggregate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown)

## Usage

```typescript
db.orgLimitAggregate.findMany({ select: { id: true } }).execute()
db.orgLimitAggregate.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitAggregate.create({ data: { entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', reserved: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' }, select: { id: true } }).execute()
db.orgLimitAggregate.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgLimitAggregate.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitAggregate records

```typescript
const items = await db.orgLimitAggregate.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a orgLimitAggregate

```typescript
const item = await db.orgLimitAggregate.create({
  data: { entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', reserved: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' },
  select: { id: true }
}).execute();
```
