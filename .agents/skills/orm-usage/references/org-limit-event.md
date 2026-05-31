# orgLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of limit events for historical reporting and audit

## Usage

```typescript
db.orgLimitEvent.findMany({ select: { id: true } }).execute()
db.orgLimitEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitEvent.create({ data: { name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' }, select: { id: true } }).execute()
db.orgLimitEvent.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.orgLimitEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitEvent records

```typescript
const items = await db.orgLimitEvent.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a orgLimitEvent

```typescript
const item = await db.orgLimitEvent.create({
  data: { name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' },
  select: { id: true }
}).execute();
```
