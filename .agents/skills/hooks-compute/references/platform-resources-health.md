# platformResourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesHealth data operations

## Usage

```typescript
usePlatformResourcesHealthsQuery({ selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } } })
usePlatformResourcesHealthQuery({ id: '<UUID>', selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } } })
useCreatePlatformResourcesHealthMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourcesHealthMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourcesHealthMutation({})
```

## Examples

### List all platformResourcesHealths

```typescript
const { data, isLoading } = usePlatformResourcesHealthsQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});
```

### Create a platformResourcesHealth

```typescript
const { mutate } = useCreatePlatformResourcesHealthMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' });
```
