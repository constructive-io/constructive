# platformNamespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
usePlatformNamespaceEventsQuery({ selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } } })
usePlatformNamespaceEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } } })
useCreatePlatformNamespaceEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformNamespaceEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformNamespaceEventMutation({})
```

## Examples

### List all platformNamespaceEvents

```typescript
const { data, isLoading } = usePlatformNamespaceEventsQuery({
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});
```

### Create a platformNamespaceEvent

```typescript
const { mutate } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' });
```
