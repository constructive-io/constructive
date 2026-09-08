# repositoryWorkflow

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Bindings from a repository event to the flow graph that should run

## Usage

```typescript
useRepositoryWorkflowsQuery({ selection: { fields: { cancelInProgress: true, concurrencyKey: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, eventType: true, graphId: true, id: true, inputs: true, isEnabled: true, name: true, refPattern: true, repositoryId: true, requiredSecrets: true, slug: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useRepositoryWorkflowQuery({ id: '<UUID>', selection: { fields: { cancelInProgress: true, concurrencyKey: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, eventType: true, graphId: true, id: true, inputs: true, isEnabled: true, name: true, refPattern: true, repositoryId: true, requiredSecrets: true, slug: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateRepositoryWorkflowMutation({ selection: { fields: { id: true } } })
useUpdateRepositoryWorkflowMutation({ selection: { fields: { id: true } } })
useDeleteRepositoryWorkflowMutation({})
```

## Examples

### List all repositoryWorkflows

```typescript
const { data, isLoading } = useRepositoryWorkflowsQuery({
  selection: { fields: { cancelInProgress: true, concurrencyKey: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, eventType: true, graphId: true, id: true, inputs: true, isEnabled: true, name: true, refPattern: true, repositoryId: true, requiredSecrets: true, slug: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a repositoryWorkflow

```typescript
const { mutate } = useCreateRepositoryWorkflowMutation({
  selection: { fields: { id: true } },
});
mutate({ cancelInProgress: '<Boolean>', concurrencyKey: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', eventType: '<String>', graphId: '<UUID>', inputs: '<JSON>', isEnabled: '<Boolean>', name: '<String>', refPattern: '<String>', repositoryId: '<UUID>', requiredSecrets: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
