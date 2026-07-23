# domainEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only audit trail of the domain verify->DNS->issue lifecycle, mirroring resource_events / cluster_events. One row per state transition emitted by the domain:* functions.

## Usage

```typescript
db.domainEvent.findMany({ select: { id: true } }).execute()
db.domainEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.domainEvent.create({ data: { actorId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>', ownerId: '<UUID>' }, select: { id: true } }).execute()
db.domainEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.domainEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all domainEvent records

```typescript
const items = await db.domainEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a domainEvent

```typescript
const item = await db.domainEvent.create({
  data: { actorId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>', ownerId: '<UUID>' },
  select: { id: true }
}).execute();
```
