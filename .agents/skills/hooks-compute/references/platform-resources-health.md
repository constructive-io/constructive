# platformResourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesHealth data operations

## Usage

```typescript
usePlatformResourcesHealthsQuery({ selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, createdByPrincipal: true, errorCount: true, id: true, imageRef: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, realm: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, storageTotalBytes: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformResourcesHealthQuery({ id: '<UUID>', selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, createdByPrincipal: true, errorCount: true, id: true, imageRef: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, realm: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, storageTotalBytes: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useUpdatePlatformResourcesHealthMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourcesHealthMutation({})
```

## Examples

### List all platformResourcesHealths

```typescript
const { data, isLoading } = usePlatformResourcesHealthsQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, createdByPrincipal: true, errorCount: true, id: true, imageRef: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, realm: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, storageTotalBytes: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```
