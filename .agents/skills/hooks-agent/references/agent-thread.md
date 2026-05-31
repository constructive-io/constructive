# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation thread

## Usage

```typescript
useAgentThreadsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, title: true, mode: true, model: true, systemPrompt: true, promptTemplateId: true } } })
useAgentThreadQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, title: true, mode: true, model: true, systemPrompt: true, promptTemplateId: true } } })
useCreateAgentThreadMutation({ selection: { fields: { id: true } } })
useUpdateAgentThreadMutation({ selection: { fields: { id: true } } })
useDeleteAgentThreadMutation({})
```

## Examples

### List all agentThreads

```typescript
const { data, isLoading } = useAgentThreadsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, title: true, mode: true, model: true, systemPrompt: true, promptTemplateId: true } },
});
```

### Create a agentThread

```typescript
const { mutate } = useCreateAgentThreadMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', status: '<String>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', promptTemplateId: '<UUID>' });
```
