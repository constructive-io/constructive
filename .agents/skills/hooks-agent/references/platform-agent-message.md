# platformAgentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Message within an agent thread with TextPart/ToolPart jsonb parts

## Usage

```typescript
usePlatformAgentMessagesQuery({ selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, deliveredRunId: true, id: true, kind: true, model: true, parts: true, threadId: true, updatedAt: true, visibility: true } } })
usePlatformAgentMessageQuery({ id: '<UUID>', selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, deliveredRunId: true, id: true, kind: true, model: true, parts: true, threadId: true, updatedAt: true, visibility: true } } })
useCreatePlatformAgentMessageMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentMessageMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentMessageMutation({})
```

## Examples

### List all platformAgentMessages

```typescript
const { data, isLoading } = usePlatformAgentMessagesQuery({
  selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, deliveredRunId: true, id: true, kind: true, model: true, parts: true, threadId: true, updatedAt: true, visibility: true } },
});
```

### Create a platformAgentMessage

```typescript
const { mutate } = useCreatePlatformAgentMessageMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', agentId: '<UUID>', authorRole: '<String>', deliveredRunId: '<UUID>', kind: '<String>', model: '<String>', parts: '<JSON>', threadId: '<UUID>', visibility: '<String>' });
```
