# platformResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
usePlatformResourcesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } } })
usePlatformResourceQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } } })
useCreatePlatformResourceMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceMutation({})
```

## Examples

### List all platformResources

```typescript
const { data, isLoading } = usePlatformResourcesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } },
});
```

### Create a platformResource

```typescript
const { mutate } = useCreatePlatformResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' });
```
