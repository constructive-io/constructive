# platformNamespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
db.platformNamespaceEvent.findMany({ select: { id: true } }).execute()
db.platformNamespaceEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformNamespaceEvent.create({ data: { actorId: '<UUID>', cpuMillicores: '<Int>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' }, select: { id: true } }).execute()
db.platformNamespaceEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformNamespaceEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformNamespaceEvent records

```typescript
const items = await db.platformNamespaceEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformNamespaceEvent

```typescript
const item = await db.platformNamespaceEvent.create({
  data: { actorId: '<UUID>', cpuMillicores: '<Int>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' },
  select: { id: true }
}).execute();
```
