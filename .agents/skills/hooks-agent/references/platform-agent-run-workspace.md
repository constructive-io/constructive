# platformAgentRunWorkspace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One repository an agent run works in: its remote, branch, commits and how the work is published

## Usage

```typescript
usePlatformAgentRunWorkspacesQuery({ selection: { fields: { actorId: true, artifacts: true, baseBranch: true, baseCommit: true, branch: true, clonedAt: true, createdAt: true, headCommit: true, id: true, lastUsedAt: true, ordinal: true, provider: true, publication: true, repo: true, repositoryId: true, runId: true, state: true, updatedAt: true, visibility: true } } })
usePlatformAgentRunWorkspaceQuery({ id: '<UUID>', selection: { fields: { actorId: true, artifacts: true, baseBranch: true, baseCommit: true, branch: true, clonedAt: true, createdAt: true, headCommit: true, id: true, lastUsedAt: true, ordinal: true, provider: true, publication: true, repo: true, repositoryId: true, runId: true, state: true, updatedAt: true, visibility: true } } })
useCreatePlatformAgentRunWorkspaceMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentRunWorkspaceMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentRunWorkspaceMutation({})
```

## Examples

### List all platformAgentRunWorkspaces

```typescript
const { data, isLoading } = usePlatformAgentRunWorkspacesQuery({
  selection: { fields: { actorId: true, artifacts: true, baseBranch: true, baseCommit: true, branch: true, clonedAt: true, createdAt: true, headCommit: true, id: true, lastUsedAt: true, ordinal: true, provider: true, publication: true, repo: true, repositoryId: true, runId: true, state: true, updatedAt: true, visibility: true } },
});
```

### Create a platformAgentRunWorkspace

```typescript
const { mutate } = useCreatePlatformAgentRunWorkspaceMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', artifacts: '<JSON>', baseBranch: '<String>', baseCommit: '<String>', branch: '<String>', clonedAt: '<Datetime>', headCommit: '<String>', lastUsedAt: '<Datetime>', ordinal: '<Int>', provider: '<String>', publication: '<String>', repo: '<String>', repositoryId: '<UUID>', runId: '<UUID>', state: '<String>', visibility: '<String>' });
```
