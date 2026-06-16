# agentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Message within an agent thread with TextPart/ToolPart jsonb parts

## Usage

```typescript
useAgentMessagesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, actorId: true, parts: true, threadId: true, authorRole: true, model: true, agentId: true } } })
useAgentMessageQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, actorId: true, parts: true, threadId: true, authorRole: true, model: true, agentId: true } } })
useCreateAgentMessageMutation({ selection: { fields: { id: true } } })
useUpdateAgentMessageMutation({ selection: { fields: { id: true } } })
useDeleteAgentMessageMutation({})
```

## Examples

### List all agentMessages

```typescript
const { data, isLoading } = useAgentMessagesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, actorId: true, parts: true, threadId: true, authorRole: true, model: true, agentId: true } },
});
```

### Create a agentMessage

```typescript
const { mutate } = useCreateAgentMessageMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', parts: '<JSON>', threadId: '<UUID>', authorRole: '<String>', model: '<String>', agentId: '<UUID>' });
```
