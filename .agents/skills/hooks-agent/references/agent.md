# agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent instance registry (human-managed or ephemeral sub-agents)

## Usage

```typescript
useAgentsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, databaseId: true, personaId: true, parentId: true, name: true, systemPrompt: true, config: true, status: true, isEphemeral: true } } })
useAgentQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, databaseId: true, personaId: true, parentId: true, name: true, systemPrompt: true, config: true, status: true, isEphemeral: true } } })
useCreateAgentMutation({ selection: { fields: { id: true } } })
useUpdateAgentMutation({ selection: { fields: { id: true } } })
useDeleteAgentMutation({})
```

## Examples

### List all agents

```typescript
const { data, isLoading } = useAgentsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, databaseId: true, personaId: true, parentId: true, name: true, systemPrompt: true, config: true, status: true, isEphemeral: true } },
});
```

### Create a agent

```typescript
const { mutate } = useCreateAgentMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', databaseId: '<UUID>', personaId: '<UUID>', parentId: '<UUID>', name: '<String>', systemPrompt: '<String>', config: '<JSON>', status: '<String>', isEphemeral: '<Boolean>' });
```
