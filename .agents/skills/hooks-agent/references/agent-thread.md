# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation thread

## Usage

```typescript
useAgentThreadsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, databaseId: true, status: true, isArchived: true, archivedAt: true, title: true, mode: true, model: true, systemPrompt: true, tags: true, promptTemplateId: true, agentId: true, parentThreadId: true } } })
useAgentThreadQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, databaseId: true, status: true, isArchived: true, archivedAt: true, title: true, mode: true, model: true, systemPrompt: true, tags: true, promptTemplateId: true, agentId: true, parentThreadId: true } } })
useCreateAgentThreadMutation({ selection: { fields: { id: true } } })
useUpdateAgentThreadMutation({ selection: { fields: { id: true } } })
useDeleteAgentThreadMutation({})
```

## Examples

### List all agentThreads

```typescript
const { data, isLoading } = useAgentThreadsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, databaseId: true, status: true, isArchived: true, archivedAt: true, title: true, mode: true, model: true, systemPrompt: true, tags: true, promptTemplateId: true, agentId: true, parentThreadId: true } },
});
```

### Create a agentThread

```typescript
const { mutate } = useCreateAgentThreadMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', databaseId: '<UUID>', status: '<String>', isArchived: '<Boolean>', archivedAt: '<Datetime>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', tags: '<String>', promptTemplateId: '<UUID>', agentId: '<UUID>', parentThreadId: '<UUID>' });
```
