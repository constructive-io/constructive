# platformAgentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation thread

## Usage

```typescript
usePlatformAgentThreadsQuery({ selection: { fields: { agentId: true, archivedAt: true, createdAt: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true, visibility: true } } })
usePlatformAgentThreadQuery({ id: '<UUID>', selection: { fields: { agentId: true, archivedAt: true, createdAt: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true, visibility: true } } })
useCreatePlatformAgentThreadMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentThreadMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentThreadMutation({})
```

## Examples

### List all platformAgentThreads

```typescript
const { data, isLoading } = usePlatformAgentThreadsQuery({
  selection: { fields: { agentId: true, archivedAt: true, createdAt: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true, visibility: true } },
});
```

### Create a platformAgentThread

```typescript
const { mutate } = useCreatePlatformAgentThreadMutation({
  selection: { fields: { id: true } },
});
mutate({ agentId: '<UUID>', archivedAt: '<Datetime>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>', visibility: '<String>' });
```
