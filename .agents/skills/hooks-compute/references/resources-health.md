# resourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourcesHealth data operations

## Usage

```typescript
useResourcesHealthsQuery({ selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } } })
useResourcesHealthQuery({ id: '<UUID>', selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } } })
useCreateResourcesHealthMutation({ selection: { fields: { id: true } } })
useUpdateResourcesHealthMutation({ selection: { fields: { id: true } } })
useDeleteResourcesHealthMutation({})
```

## Examples

### List all resourcesHealths

```typescript
const { data, isLoading } = useResourcesHealthsQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});
```

### Create a resourcesHealth

```typescript
const { mutate } = useCreateResourcesHealthMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' });
```
