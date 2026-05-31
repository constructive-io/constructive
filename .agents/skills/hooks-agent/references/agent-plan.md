# agentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflow plan attached to an agent thread with ordered tasks and optional approval gates

## Usage

```typescript
useAgentPlansQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, threadId: true, title: true, description: true, status: true } } })
useAgentPlanQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, threadId: true, title: true, description: true, status: true } } })
useCreateAgentPlanMutation({ selection: { fields: { id: true } } })
useUpdateAgentPlanMutation({ selection: { fields: { id: true } } })
useDeleteAgentPlanMutation({})
```

## Examples

### List all agentPlans

```typescript
const { data, isLoading } = useAgentPlansQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, threadId: true, title: true, description: true, status: true } },
});
```

### Create a agentPlan

```typescript
const { mutate } = useCreateAgentPlanMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', threadId: '<UUID>', title: '<String>', description: '<String>', status: '<String>' });
```
