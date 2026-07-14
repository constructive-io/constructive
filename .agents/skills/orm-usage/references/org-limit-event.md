# orgLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of limit events for historical reporting and audit

## Usage

```typescript
db.orgLimitEvent.findMany({ select: { id: true } }).execute()
db.orgLimitEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitEvent.create({ data: { actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute()
db.orgLimitEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgLimitEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitEvent records

```typescript
const items = await db.orgLimitEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgLimitEvent

```typescript
const item = await db.orgLimitEvent.create({
  data: { actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' },
  select: { id: true }
}).execute();
```
