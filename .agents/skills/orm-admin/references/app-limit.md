# appLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
db.appLimit.findMany({ select: { id: true } }).execute()
db.appLimit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' }, select: { id: true } }).execute()
db.appLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.appLimit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimit records

```typescript
const items = await db.appLimit.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appLimit

```typescript
const item = await db.appLimit.create({
  data: { name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' },
  select: { id: true }
}).execute();
```
