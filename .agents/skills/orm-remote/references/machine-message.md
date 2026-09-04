# machineMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only ledger of session input, output and lifecycle

## Usage

```typescript
db.machineMessage.findMany({ select: { id: true } }).execute()
db.machineMessage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.machineMessage.create({ data: { actorId: '<UUID>', content: '<JSON>', createdByPrincipal: '<UUID>', entityId: '<UUID>', kind: '<String>', ownerId: '<UUID>', recordedAt: '<Datetime>', seq: '<BigInt>', sessionId: '<UUID>' }, select: { id: true } }).execute()
db.machineMessage.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.machineMessage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all machineMessage records

```typescript
const items = await db.machineMessage.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a machineMessage

```typescript
const item = await db.machineMessage.create({
  data: { actorId: '<UUID>', content: '<JSON>', createdByPrincipal: '<UUID>', entityId: '<UUID>', kind: '<String>', ownerId: '<UUID>', recordedAt: '<Datetime>', seq: '<BigInt>', sessionId: '<UUID>' },
  select: { id: true }
}).execute();
```
