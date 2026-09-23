# agentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Shared system prompt templates for agent conversations

## Usage

```typescript
useAgentPromptsQuery({ selection: { fields: { content: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useAgentPromptQuery({ id: '<UUID>', selection: { fields: { content: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateAgentPromptMutation({ selection: { fields: { id: true } } })
useUpdateAgentPromptMutation({ selection: { fields: { id: true } } })
useDeleteAgentPromptMutation({})
```

## Examples

### List all agentPrompts

```typescript
const { data, isLoading } = useAgentPromptsQuery({
  selection: { fields: { content: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a agentPrompt

```typescript
const { mutate } = useCreateAgentPromptMutation({
  selection: { fields: { id: true } },
});
mutate({ content: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
