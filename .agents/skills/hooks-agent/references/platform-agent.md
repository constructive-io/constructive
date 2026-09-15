# platformAgent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent instance registry (human-managed or ephemeral sub-agents)

## Usage

```typescript
usePlatformAgentsQuery({ selection: { fields: { config: true, createdAt: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } } })
usePlatformAgentQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } } })
useCreatePlatformAgentMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentMutation({})
```

## Examples

### List all platformAgents

```typescript
const { data, isLoading } = usePlatformAgentsQuery({
  selection: { fields: { config: true, createdAt: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } },
});
```

### Create a platformAgent

```typescript
const { mutate } = useCreatePlatformAgentMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' });
```
