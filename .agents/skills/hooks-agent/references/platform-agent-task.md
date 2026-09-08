# platformAgentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Task within a plan, with ordering and optional approval gates

## Usage

```typescript
usePlatformAgentTasksQuery({ selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true, visibility: true } } })
usePlatformAgentTaskQuery({ id: '<UUID>', selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true, visibility: true } } })
useCreatePlatformAgentTaskMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentTaskMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentTaskMutation({})
```

## Examples

### List all platformAgentTasks

```typescript
const { data, isLoading } = usePlatformAgentTasksQuery({
  selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true, visibility: true } },
});
```

### Create a platformAgentTask

```typescript
const { mutate } = useCreatePlatformAgentTaskMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>', visibility: '<String>' });
```
