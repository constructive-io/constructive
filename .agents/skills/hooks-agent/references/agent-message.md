# agentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Message within an agent thread with TextPart/ToolPart jsonb parts

## Usage

```typescript
useAgentMessagesQuery({ selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, databaseId: true, id: true, model: true, parts: true, threadId: true, updatedAt: true } } })
useAgentMessageQuery({ id: '<UUID>', selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, databaseId: true, id: true, model: true, parts: true, threadId: true, updatedAt: true } } })
useCreateAgentMessageMutation({ selection: { fields: { id: true } } })
useUpdateAgentMessageMutation({ selection: { fields: { id: true } } })
useDeleteAgentMessageMutation({})
```

## Examples

### List all agentMessages

```typescript
const { data, isLoading } = useAgentMessagesQuery({
  selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, databaseId: true, id: true, model: true, parts: true, threadId: true, updatedAt: true } },
});
```

### Create a agentMessage

```typescript
const { mutate } = useCreateAgentMessageMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', agentId: '<UUID>', authorRole: '<String>', databaseId: '<UUID>', model: '<String>', parts: '<JSON>', threadId: '<UUID>' });
```
