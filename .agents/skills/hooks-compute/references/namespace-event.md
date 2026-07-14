# namespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
useNamespaceEventsQuery({ selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } } })
useNamespaceEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } } })
useCreateNamespaceEventMutation({ selection: { fields: { id: true } } })
useUpdateNamespaceEventMutation({ selection: { fields: { id: true } } })
useDeleteNamespaceEventMutation({})
```

## Examples

### List all namespaceEvents

```typescript
const { data, isLoading } = useNamespaceEventsQuery({
  selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, databaseId: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } },
});
```

### Create a namespaceEvent

```typescript
const { mutate } = useCreateNamespaceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', cpuMillicores: '<Int>', databaseId: '<UUID>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' });
```
