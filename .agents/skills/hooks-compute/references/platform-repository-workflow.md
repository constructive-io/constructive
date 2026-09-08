# platformRepositoryWorkflow

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Bindings from a repository event to the flow graph that should run

## Usage

```typescript
usePlatformRepositoryWorkflowsQuery({ selection: { fields: { cancelInProgress: true, concurrencyKey: true, createdAt: true, createdBy: true, createdByPrincipal: true, eventType: true, graphId: true, id: true, inputs: true, isEnabled: true, name: true, refPattern: true, repositoryId: true, requiredSecrets: true, slug: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformRepositoryWorkflowQuery({ id: '<UUID>', selection: { fields: { cancelInProgress: true, concurrencyKey: true, createdAt: true, createdBy: true, createdByPrincipal: true, eventType: true, graphId: true, id: true, inputs: true, isEnabled: true, name: true, refPattern: true, repositoryId: true, requiredSecrets: true, slug: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformRepositoryWorkflowMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRepositoryWorkflowMutation({ selection: { fields: { id: true } } })
useDeletePlatformRepositoryWorkflowMutation({})
```

## Examples

### List all platformRepositoryWorkflows

```typescript
const { data, isLoading } = usePlatformRepositoryWorkflowsQuery({
  selection: { fields: { cancelInProgress: true, concurrencyKey: true, createdAt: true, createdBy: true, createdByPrincipal: true, eventType: true, graphId: true, id: true, inputs: true, isEnabled: true, name: true, refPattern: true, repositoryId: true, requiredSecrets: true, slug: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformRepositoryWorkflow

```typescript
const { mutate } = useCreatePlatformRepositoryWorkflowMutation({
  selection: { fields: { id: true } },
});
mutate({ cancelInProgress: '<Boolean>', concurrencyKey: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', eventType: '<String>', graphId: '<UUID>', inputs: '<JSON>', isEnabled: '<Boolean>', name: '<String>', refPattern: '<String>', repositoryId: '<UUID>', requiredSecrets: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
