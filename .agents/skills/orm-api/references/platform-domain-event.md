# platformDomainEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit trail of domain lifecycle events

## Usage

```typescript
db.platformDomainEvent.findMany({ select: { id: true } }).execute()
db.platformDomainEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformDomainEvent.create({ data: { actorId: '<UUID>', domainId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>' }, select: { id: true } }).execute()
db.platformDomainEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformDomainEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformDomainEvent records

```typescript
const items = await db.platformDomainEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformDomainEvent

```typescript
const item = await db.platformDomainEvent.create({
  data: { actorId: '<UUID>', domainId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>' },
  select: { id: true }
}).execute();
```
