# platformResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
usePlatformResourcesQuery({ selection: { fields: { annotations: true, createdAt: true, createdBy: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } } })
usePlatformResourceQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, createdBy: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } } })
useCreatePlatformResourceMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceMutation({})
```

## Examples

### List all platformResources

```typescript
const { data, isLoading } = usePlatformResourcesQuery({
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } },
});
```

### Create a platformResource

```typescript
const { mutate } = useCreatePlatformResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', createdBy: '<UUID>', errorCount: '<Int>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', updatedBy: '<UUID>' });
```
