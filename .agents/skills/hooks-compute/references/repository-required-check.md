# repositoryRequiredCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflows required to pass before a repository proposal merges

## Usage

```typescript
useRepositoryRequiredChecksQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, repositoryId: true, updatedAt: true, workflowId: true } } })
useRepositoryRequiredCheckQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, repositoryId: true, updatedAt: true, workflowId: true } } })
useCreateRepositoryRequiredCheckMutation({ selection: { fields: { id: true } } })
useUpdateRepositoryRequiredCheckMutation({ selection: { fields: { id: true } } })
useDeleteRepositoryRequiredCheckMutation({})
```

## Examples

### List all repositoryRequiredChecks

```typescript
const { data, isLoading } = useRepositoryRequiredChecksQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, repositoryId: true, updatedAt: true, workflowId: true } },
});
```

### Create a repositoryRequiredCheck

```typescript
const { mutate } = useCreateRepositoryRequiredCheckMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', repositoryId: '<UUID>', workflowId: '<UUID>' });
```
