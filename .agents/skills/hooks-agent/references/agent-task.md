# agentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Task within a plan, with ordering and optional approval gates

## Usage

```typescript
useAgentTasksQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } } })
useAgentTaskQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } } })
useCreateAgentTaskMutation({ selection: { fields: { id: true } } })
useUpdateAgentTaskMutation({ selection: { fields: { id: true } } })
useDeleteAgentTaskMutation({})
```

## Examples

### List all agentTasks

```typescript
const { data, isLoading } = useAgentTasksQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } },
});
```

### Create a agentTask

```typescript
const { mutate } = useCreateAgentTaskMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', status: '<String>', planId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', orderIndex: '<Int>', requiresApproval: '<Boolean>', approvalStatus: '<String>', approvedBy: '<UUID>', approvedAt: '<Datetime>', approvalFeedback: '<String>' });
```
