# build

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One run of a repository workflow: its commit, its job, and what it produced

## Usage

```typescript
useBuildsQuery({ selection: { fields: { actorId: true, attempt: true, commitSha: true, conclusion: true, createdAt: true, createdByPrincipal: true, databaseId: true, eventId: true, finishedAt: true, id: true, imageRef: true, jobId: true, logs: true, matrixKey: true, metadata: true, proposalId: true, ref: true, repositoryId: true, startedAt: true, status: true, updatedAt: true, updatedByPrincipal: true, workflowId: true } } })
useBuildQuery({ id: '<UUID>', selection: { fields: { actorId: true, attempt: true, commitSha: true, conclusion: true, createdAt: true, createdByPrincipal: true, databaseId: true, eventId: true, finishedAt: true, id: true, imageRef: true, jobId: true, logs: true, matrixKey: true, metadata: true, proposalId: true, ref: true, repositoryId: true, startedAt: true, status: true, updatedAt: true, updatedByPrincipal: true, workflowId: true } } })
useCreateBuildMutation({ selection: { fields: { id: true } } })
useUpdateBuildMutation({ selection: { fields: { id: true } } })
useDeleteBuildMutation({})
```

## Examples

### List all builds

```typescript
const { data, isLoading } = useBuildsQuery({
  selection: { fields: { actorId: true, attempt: true, commitSha: true, conclusion: true, createdAt: true, createdByPrincipal: true, databaseId: true, eventId: true, finishedAt: true, id: true, imageRef: true, jobId: true, logs: true, matrixKey: true, metadata: true, proposalId: true, ref: true, repositoryId: true, startedAt: true, status: true, updatedAt: true, updatedByPrincipal: true, workflowId: true } },
});
```

### Create a build

```typescript
const { mutate } = useCreateBuildMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', attempt: '<Int>', commitSha: '<String>', conclusion: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', eventId: '<UUID>', finishedAt: '<Datetime>', imageRef: '<String>', jobId: '<BigInt>', logs: '<Upload>', matrixKey: '<String>', metadata: '<JSON>', proposalId: '<UUID>', ref: '<String>', repositoryId: '<UUID>', startedAt: '<Datetime>', status: '<String>', updatedByPrincipal: '<UUID>', workflowId: '<UUID>' });
```
