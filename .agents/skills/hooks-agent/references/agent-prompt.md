# agentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Shared system prompt templates for agent conversations

## Usage

```typescript
useAgentPromptsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, name: true, content: true, description: true, isDefault: true, metadata: true } } })
useAgentPromptQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, name: true, content: true, description: true, isDefault: true, metadata: true } } })
useCreateAgentPromptMutation({ selection: { fields: { id: true } } })
useUpdateAgentPromptMutation({ selection: { fields: { id: true } } })
useDeleteAgentPromptMutation({})
```

## Examples

### List all agentPrompts

```typescript
const { data, isLoading } = useAgentPromptsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, name: true, content: true, description: true, isDefault: true, metadata: true } },
});
```

### Create a agentPrompt

```typescript
const { mutate } = useCreateAgentPromptMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', name: '<String>', content: '<String>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>' });
```
