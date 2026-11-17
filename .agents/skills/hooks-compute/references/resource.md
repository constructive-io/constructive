# resource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
useResourcesQuery({ selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, errorCount: true, id: true, imageRef: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, realm: true, replicas: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, storageTotalBytes: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useResourceQuery({ id: '<UUID>', selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, errorCount: true, id: true, imageRef: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, realm: true, replicas: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, storageTotalBytes: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateResourceMutation({ selection: { fields: { id: true } } })
useUpdateResourceMutation({ selection: { fields: { id: true } } })
useDeleteResourceMutation({})
```

## Examples

### List all resources

```typescript
const { data, isLoading } = useResourcesQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, errorCount: true, id: true, imageRef: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, realm: true, replicas: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, storageTotalBytes: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a resource

```typescript
const { mutate } = useCreateResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', imageRef: '<String>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', name: '<String>', namespaceId: '<UUID>', realm: '<String>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
