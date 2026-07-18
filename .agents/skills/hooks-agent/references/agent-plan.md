# agentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflow plan attached to an agent thread with ordered tasks and optional approval gates

## Usage

```typescript
useAgentPlansQuery({ selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true } } })
useAgentPlanQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true } } })
useCreateAgentPlanMutation({ selection: { fields: { id: true } } })
useUpdateAgentPlanMutation({ selection: { fields: { id: true } } })
useDeleteAgentPlanMutation({})
```

## Examples

### List all agentPlans

```typescript
const { data, isLoading } = useAgentPlansQuery({
  selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true } },
});
```

### Create a agentPlan

```typescript
const { mutate } = useCreateAgentPlanMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>' });
```
