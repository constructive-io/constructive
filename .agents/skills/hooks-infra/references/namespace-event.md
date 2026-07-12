# namespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
useNamespaceEventsQuery({ selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } } })
useNamespaceEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } } })
useCreateNamespaceEventMutation({ selection: { fields: { id: true } } })
useUpdateNamespaceEventMutation({ selection: { fields: { id: true } } })
useDeleteNamespaceEventMutation({})
```

## Examples

### List all namespaceEvents

```typescript
const { data, isLoading } = useNamespaceEventsQuery({
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});
```

### Create a namespaceEvent

```typescript
const { mutate } = useCreateNamespaceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' });
```
