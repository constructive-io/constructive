# platformNamespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
usePlatformNamespaceEventsQuery({ selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } } })
usePlatformNamespaceEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } } })
useCreatePlatformNamespaceEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformNamespaceEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformNamespaceEventMutation({})
```

## Examples

### List all platformNamespaceEvents

```typescript
const { data, isLoading } = usePlatformNamespaceEventsQuery({
  selection: { fields: { actorId: true, cpuMillicores: true, createdAt: true, eventType: true, id: true, memoryBytes: true, message: true, metadata: true, metrics: true, namespaceId: true, networkEgressBytes: true, networkIngressBytes: true, podCount: true, storageBytes: true } },
});
```

### Create a platformNamespaceEvent

```typescript
const { mutate } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', cpuMillicores: '<Int>', eventType: '<String>', memoryBytes: '<BigInt>', message: '<String>', metadata: '<JSON>', metrics: '<JSON>', namespaceId: '<UUID>', networkEgressBytes: '<BigInt>', networkIngressBytes: '<BigInt>', podCount: '<Int>', storageBytes: '<BigInt>' });
```
