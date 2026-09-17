# agentRun

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One supervised agent run of a thread: its placement, workspace, cursor and artifacts

## Usage

```typescript
useAgentRunsQuery({ selection: { fields: { actorId: true, artifacts: true, attempt: true, baseCommit: true, branch: true, createdAt: true, databaseId: true, deadlineAt: true, entityId: true, error: true, executionId: true, finishedAt: true, headCommit: true, id: true, lastEventSeq: true, parentRunId: true, placement: true, principalId: true, repoUrl: true, startedAt: true, status: true, threadId: true, tokenUsage: true, totalCost: true, updatedAt: true, visibility: true } } })
useAgentRunQuery({ id: '<UUID>', selection: { fields: { actorId: true, artifacts: true, attempt: true, baseCommit: true, branch: true, createdAt: true, databaseId: true, deadlineAt: true, entityId: true, error: true, executionId: true, finishedAt: true, headCommit: true, id: true, lastEventSeq: true, parentRunId: true, placement: true, principalId: true, repoUrl: true, startedAt: true, status: true, threadId: true, tokenUsage: true, totalCost: true, updatedAt: true, visibility: true } } })
useCreateAgentRunMutation({ selection: { fields: { id: true } } })
useUpdateAgentRunMutation({ selection: { fields: { id: true } } })
useDeleteAgentRunMutation({})
```

## Examples

### List all agentRuns

```typescript
const { data, isLoading } = useAgentRunsQuery({
  selection: { fields: { actorId: true, artifacts: true, attempt: true, baseCommit: true, branch: true, createdAt: true, databaseId: true, deadlineAt: true, entityId: true, error: true, executionId: true, finishedAt: true, headCommit: true, id: true, lastEventSeq: true, parentRunId: true, placement: true, principalId: true, repoUrl: true, startedAt: true, status: true, threadId: true, tokenUsage: true, totalCost: true, updatedAt: true, visibility: true } },
});
```

### Create a agentRun

```typescript
const { mutate } = useCreateAgentRunMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', artifacts: '<JSON>', attempt: '<Int>', baseCommit: '<String>', branch: '<String>', databaseId: '<UUID>', deadlineAt: '<Datetime>', entityId: '<UUID>', error: '<String>', executionId: '<UUID>', finishedAt: '<Datetime>', headCommit: '<String>', lastEventSeq: '<Int>', parentRunId: '<UUID>', placement: '<String>', principalId: '<UUID>', repoUrl: '<String>', startedAt: '<Datetime>', status: '<String>', threadId: '<UUID>', tokenUsage: '<JSON>', totalCost: '<BigFloat>', visibility: '<String>' });
```
