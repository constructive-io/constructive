# orgLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
db.orgLimit.findMany({ select: { id: true } }).execute()
db.orgLimit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimit.create({ data: { actorId: '<UUID>', entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' }, select: { id: true } }).execute()
db.orgLimit.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgLimit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimit records

```typescript
const items = await db.orgLimit.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgLimit

```typescript
const item = await db.orgLimit.create({
  data: { actorId: '<UUID>', entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' },
  select: { id: true }
}).execute();
```
