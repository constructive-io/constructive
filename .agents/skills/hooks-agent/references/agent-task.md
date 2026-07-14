# agentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Task within a plan, with ordering and optional approval gates

## Usage

```typescript
useAgentTasksQuery({ selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, databaseId: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true } } })
useAgentTaskQuery({ id: '<UUID>', selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, databaseId: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true } } })
useCreateAgentTaskMutation({ selection: { fields: { id: true } } })
useUpdateAgentTaskMutation({ selection: { fields: { id: true } } })
useDeleteAgentTaskMutation({})
```

## Examples

### List all agentTasks

```typescript
const { data, isLoading } = useAgentTasksQuery({
  selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, databaseId: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true } },
});
```

### Create a agentTask

```typescript
const { mutate } = useCreateAgentTaskMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', databaseId: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>' });
```
