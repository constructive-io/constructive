# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation thread

## Usage

```typescript
useAgentThreadsQuery({ selection: { fields: { agentId: true, archivedAt: true, createdAt: true, databaseId: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true } } })
useAgentThreadQuery({ id: '<UUID>', selection: { fields: { agentId: true, archivedAt: true, createdAt: true, databaseId: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true } } })
useCreateAgentThreadMutation({ selection: { fields: { id: true } } })
useUpdateAgentThreadMutation({ selection: { fields: { id: true } } })
useDeleteAgentThreadMutation({})
```

## Examples

### List all agentThreads

```typescript
const { data, isLoading } = useAgentThreadsQuery({
  selection: { fields: { agentId: true, archivedAt: true, createdAt: true, databaseId: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true } },
});
```

### Create a agentThread

```typescript
const { mutate } = useCreateAgentThreadMutation({
  selection: { fields: { id: true } },
});
mutate({ agentId: '<UUID>', archivedAt: '<Datetime>', databaseId: '<UUID>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>' });
```
