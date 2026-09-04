# platformBuild

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One run of a repository workflow: its commit, its job, and what it produced

## Usage

```typescript
usePlatformBuildsQuery({ selection: { fields: { actorId: true, catalogImageId: true, commitSha: true, createdAt: true, createdByPrincipal: true, eventId: true, finishedAt: true, id: true, jobId: true, logs: true, metadata: true, proposalId: true, ref: true, repositoryId: true, startedAt: true, status: true, updatedAt: true, updatedByPrincipal: true, workflowId: true } } })
usePlatformBuildQuery({ id: '<UUID>', selection: { fields: { actorId: true, catalogImageId: true, commitSha: true, createdAt: true, createdByPrincipal: true, eventId: true, finishedAt: true, id: true, jobId: true, logs: true, metadata: true, proposalId: true, ref: true, repositoryId: true, startedAt: true, status: true, updatedAt: true, updatedByPrincipal: true, workflowId: true } } })
useCreatePlatformBuildMutation({ selection: { fields: { id: true } } })
useUpdatePlatformBuildMutation({ selection: { fields: { id: true } } })
useDeletePlatformBuildMutation({})
```

## Examples

### List all platformBuilds

```typescript
const { data, isLoading } = usePlatformBuildsQuery({
  selection: { fields: { actorId: true, catalogImageId: true, commitSha: true, createdAt: true, createdByPrincipal: true, eventId: true, finishedAt: true, id: true, jobId: true, logs: true, metadata: true, proposalId: true, ref: true, repositoryId: true, startedAt: true, status: true, updatedAt: true, updatedByPrincipal: true, workflowId: true } },
});
```

### Create a platformBuild

```typescript
const { mutate } = useCreatePlatformBuildMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', catalogImageId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', eventId: '<UUID>', finishedAt: '<Datetime>', jobId: '<BigInt>', logs: '<Upload>', metadata: '<JSON>', proposalId: '<UUID>', ref: '<String>', repositoryId: '<UUID>', startedAt: '<Datetime>', status: '<String>', updatedByPrincipal: '<UUID>', workflowId: '<UUID>' });
```
