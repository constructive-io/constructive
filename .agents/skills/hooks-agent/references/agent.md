# agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent instance registry (human-managed or ephemeral sub-agents)

## Usage

```typescript
useAgentsQuery({ selection: { fields: { config: true, createdAt: true, databaseId: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } } })
useAgentQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, databaseId: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } } })
useCreateAgentMutation({ selection: { fields: { id: true } } })
useUpdateAgentMutation({ selection: { fields: { id: true } } })
useDeleteAgentMutation({})
```

## Examples

### List all agents

```typescript
const { data, isLoading } = useAgentsQuery({
  selection: { fields: { config: true, createdAt: true, databaseId: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } },
});
```

### Create a agent

```typescript
const { mutate } = useCreateAgentMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', databaseId: '<UUID>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' });
```
