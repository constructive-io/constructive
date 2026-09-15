# platformAgentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Shared system prompt templates for agent conversations

## Usage

```typescript
usePlatformAgentPromptsQuery({ selection: { fields: { content: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformAgentPromptQuery({ id: '<UUID>', selection: { fields: { content: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformAgentPromptMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentPromptMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentPromptMutation({})
```

## Examples

### List all platformAgentPrompts

```typescript
const { data, isLoading } = usePlatformAgentPromptsQuery({
  selection: { fields: { content: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformAgentPrompt

```typescript
const { mutate } = useCreatePlatformAgentPromptMutation({
  selection: { fields: { id: true } },
});
mutate({ content: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
