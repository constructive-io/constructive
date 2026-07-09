# resource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
useResourcesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true } } })
useResourceQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true } } })
useCreateResourceMutation({ selection: { fields: { id: true } } })
useUpdateResourceMutation({ selection: { fields: { id: true } } })
useDeleteResourceMutation({})
```

## Examples

### List all resources

```typescript
const { data, isLoading } = useResourcesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});
```

### Create a resource

```typescript
const { mutate } = useCreateResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' });
```
