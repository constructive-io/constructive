# platformRepositoryRequiredCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflows required to pass before a repository proposal merges

## Usage

```typescript
usePlatformRepositoryRequiredChecksQuery({ selection: { fields: { createdAt: true, id: true, repositoryId: true, updatedAt: true, workflowId: true } } })
usePlatformRepositoryRequiredCheckQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, repositoryId: true, updatedAt: true, workflowId: true } } })
useCreatePlatformRepositoryRequiredCheckMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRepositoryRequiredCheckMutation({ selection: { fields: { id: true } } })
useDeletePlatformRepositoryRequiredCheckMutation({})
```

## Examples

### List all platformRepositoryRequiredChecks

```typescript
const { data, isLoading } = usePlatformRepositoryRequiredChecksQuery({
  selection: { fields: { createdAt: true, id: true, repositoryId: true, updatedAt: true, workflowId: true } },
});
```

### Create a platformRepositoryRequiredCheck

```typescript
const { mutate } = useCreatePlatformRepositoryRequiredCheckMutation({
  selection: { fields: { id: true } },
});
mutate({ repositoryId: '<UUID>', workflowId: '<UUID>' });
```
