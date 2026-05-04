# agentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

An agent- or user-authored todo item attached to an agent_thread. Captures the planning surface for agent-mode conversations: each row is a single discrete unit of work with a status lifecycle (pending → in-progress → done|failed). Cascade-deleted with the parent thread; RLS is owner-only.

## Usage

```typescript
useAgentTasksQuery({ selection: { fields: { threadId: true, entityId: true, description: true, source: true, error: true, id: true, createdAt: true, updatedAt: true, ownerId: true, status: true } } })
useAgentTaskQuery({ id: '<UUID>', selection: { fields: { threadId: true, entityId: true, description: true, source: true, error: true, id: true, createdAt: true, updatedAt: true, ownerId: true, status: true } } })
useCreateAgentTaskMutation({ selection: { fields: { id: true } } })
useUpdateAgentTaskMutation({ selection: { fields: { id: true } } })
useDeleteAgentTaskMutation({})
```

## Examples

### List all agentTasks

```typescript
const { data, isLoading } = useAgentTasksQuery({
  selection: { fields: { threadId: true, entityId: true, description: true, source: true, error: true, id: true, createdAt: true, updatedAt: true, ownerId: true, status: true } },
});
```

### Create a agentTask

```typescript
const { mutate } = useCreateAgentTaskMutation({
  selection: { fields: { id: true } },
});
mutate({ threadId: '<UUID>', entityId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', ownerId: '<UUID>', status: '<String>' });
```
