# appLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of limit events for historical reporting and audit

## Usage

```typescript
db.appLimitEvent.findMany({ select: { id: true } }).execute()
db.appLimitEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitEvent.create({ data: { name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' }, select: { id: true } }).execute()
db.appLimitEvent.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.appLimitEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitEvent records

```typescript
const items = await db.appLimitEvent.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appLimitEvent

```typescript
const item = await db.appLimitEvent.create({
  data: { name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' },
  select: { id: true }
}).execute();
```
