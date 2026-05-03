# agentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A single message in an agent_thread. The full client-rendered content (TextPart and ToolPart, including the ToolPart state machine and inline approval object) lives in the `parts` jsonb column — there is no separate agent_tool_call or agent_tool_approval table in v1. Cascade-deleted with the parent thread; RLS is owner-only.

## Usage

```typescript
useAgentMessagesQuery({ selection: { fields: { threadId: true, entityId: true, authorRole: true, id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true } } })
useAgentMessageQuery({ id: '<UUID>', selection: { fields: { threadId: true, entityId: true, authorRole: true, id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true } } })
useCreateAgentMessageMutation({ selection: { fields: { id: true } } })
useUpdateAgentMessageMutation({ selection: { fields: { id: true } } })
useDeleteAgentMessageMutation({})
```

## Examples

### List all agentMessages

```typescript
const { data, isLoading } = useAgentMessagesQuery({
  selection: { fields: { threadId: true, entityId: true, authorRole: true, id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true } },
});
```

### Create a agentMessage

```typescript
const { mutate } = useCreateAgentMessageMutation({
  selection: { fields: { id: true } },
});
mutate({ threadId: '<UUID>', entityId: '<UUID>', authorRole: '<String>', ownerId: '<UUID>', parts: '<JSON>' });
```
