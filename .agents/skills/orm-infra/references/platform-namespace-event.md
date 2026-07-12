# platformNamespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
db.platformNamespaceEvent.findMany({ select: { id: true } }).execute()
db.platformNamespaceEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformNamespaceEvent.create({ data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>' }, select: { id: true } }).execute()
db.platformNamespaceEvent.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute()
db.platformNamespaceEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformNamespaceEvent records

```typescript
const items = await db.platformNamespaceEvent.findMany({
  select: { id: true, namespaceId: true }
}).execute();
```

### Create a platformNamespaceEvent

```typescript
const item = await db.platformNamespaceEvent.create({
  data: { namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>' },
  select: { id: true }
}).execute();
```
