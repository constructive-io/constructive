# platformAgentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflow plan attached to an agent thread with ordered tasks and optional approval gates

## Usage

```typescript
usePlatformAgentPlansQuery({ selection: { fields: { createdAt: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true, visibility: true } } })
usePlatformAgentPlanQuery({ id: '<UUID>', selection: { fields: { createdAt: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true, visibility: true } } })
useCreatePlatformAgentPlanMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentPlanMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentPlanMutation({})
```

## Examples

### List all platformAgentPlans

```typescript
const { data, isLoading } = usePlatformAgentPlansQuery({
  selection: { fields: { createdAt: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true, visibility: true } },
});
```

### Create a platformAgentPlan

```typescript
const { mutate } = useCreatePlatformAgentPlanMutation({
  selection: { fields: { id: true } },
});
mutate({ description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>', visibility: '<String>' });
```
