# namespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
db.namespaceEvent.findMany({ select: { id: true } }).execute()
db.namespaceEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.namespaceEvent.create({ data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute()
db.namespaceEvent.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute()
db.namespaceEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all namespaceEvent records

```typescript
const items = await db.namespaceEvent.findMany({
  select: { id: true, namespaceId: true }
}).execute();
```

### Create a namespaceEvent

```typescript
const item = await db.namespaceEvent.create({
  data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
