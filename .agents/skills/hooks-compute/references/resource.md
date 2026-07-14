# resource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
useResourcesQuery({ selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } } })
useResourceQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } } })
useCreateResourceMutation({ selection: { fields: { id: true } } })
useUpdateResourceMutation({ selection: { fields: { id: true } } })
useDeleteResourceMutation({})
```

## Examples

### List all resources

```typescript
const { data, isLoading } = useResourcesQuery({
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, integrations: true, kind: true, labels: true, lastError: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, updatedAt: true, updatedBy: true } },
});
```

### Create a resource

```typescript
const { mutate } = useCreateResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', updatedBy: '<UUID>' });
```
