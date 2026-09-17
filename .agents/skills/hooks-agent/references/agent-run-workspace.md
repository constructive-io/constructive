# agentRunWorkspace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One repository an agent run works in: its remote, branch, commits and how the work is published

## Usage

```typescript
useAgentRunWorkspacesQuery({ selection: { fields: { actorId: true, artifacts: true, baseBranch: true, baseCommit: true, branch: true, clonedAt: true, createdAt: true, databaseId: true, headCommit: true, id: true, lastUsedAt: true, ordinal: true, provider: true, publication: true, repo: true, repositoryId: true, runId: true, state: true, updatedAt: true, visibility: true } } })
useAgentRunWorkspaceQuery({ id: '<UUID>', selection: { fields: { actorId: true, artifacts: true, baseBranch: true, baseCommit: true, branch: true, clonedAt: true, createdAt: true, databaseId: true, headCommit: true, id: true, lastUsedAt: true, ordinal: true, provider: true, publication: true, repo: true, repositoryId: true, runId: true, state: true, updatedAt: true, visibility: true } } })
useCreateAgentRunWorkspaceMutation({ selection: { fields: { id: true } } })
useUpdateAgentRunWorkspaceMutation({ selection: { fields: { id: true } } })
useDeleteAgentRunWorkspaceMutation({})
```

## Examples

### List all agentRunWorkspaces

```typescript
const { data, isLoading } = useAgentRunWorkspacesQuery({
  selection: { fields: { actorId: true, artifacts: true, baseBranch: true, baseCommit: true, branch: true, clonedAt: true, createdAt: true, databaseId: true, headCommit: true, id: true, lastUsedAt: true, ordinal: true, provider: true, publication: true, repo: true, repositoryId: true, runId: true, state: true, updatedAt: true, visibility: true } },
});
```

### Create a agentRunWorkspace

```typescript
const { mutate } = useCreateAgentRunWorkspaceMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', artifacts: '<JSON>', baseBranch: '<String>', baseCommit: '<String>', branch: '<String>', clonedAt: '<Datetime>', databaseId: '<UUID>', headCommit: '<String>', lastUsedAt: '<Datetime>', ordinal: '<Int>', provider: '<String>', publication: '<String>', repo: '<String>', repositoryId: '<UUID>', runId: '<UUID>', state: '<String>', visibility: '<String>' });
```
