# appLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
db.appLimit.findMany({ select: { id: true } }).execute()
db.appLimit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimit.create({ data: { actorId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' }, select: { id: true } }).execute()
db.appLimit.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appLimit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimit records

```typescript
const items = await db.appLimit.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appLimit

```typescript
const item = await db.appLimit.create({
  data: { actorId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' },
  select: { id: true }
}).execute();
```
