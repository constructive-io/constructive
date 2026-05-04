# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation. Owns the chat-mode + model + system-prompt snapshot for the lifetime of the conversation, and is the entity-scoping anchor — descendants (agent_message, agent_task) inherit entity_id from this row via DataInheritFromParent. RLS is owner-only (AuthzDirectOwner); entity_id is a grouping dimension, not a security dimension.

## Usage

```typescript
useAgentThreadsQuery({ selection: { fields: { title: true, mode: true, model: true, systemPrompt: true, id: true, createdAt: true, updatedAt: true, ownerId: true, entityId: true, status: true } } })
useAgentThreadQuery({ id: '<UUID>', selection: { fields: { title: true, mode: true, model: true, systemPrompt: true, id: true, createdAt: true, updatedAt: true, ownerId: true, entityId: true, status: true } } })
useCreateAgentThreadMutation({ selection: { fields: { id: true } } })
useUpdateAgentThreadMutation({ selection: { fields: { id: true } } })
useDeleteAgentThreadMutation({})
```

## Examples

### List all agentThreads

```typescript
const { data, isLoading } = useAgentThreadsQuery({
  selection: { fields: { title: true, mode: true, model: true, systemPrompt: true, id: true, createdAt: true, updatedAt: true, ownerId: true, entityId: true, status: true } },
});
```

### Create a agentThread

```typescript
const { mutate } = useCreateAgentThreadMutation({
  selection: { fields: { id: true } },
});
mutate({ title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', ownerId: '<UUID>', entityId: '<UUID>', status: '<String>' });
```
