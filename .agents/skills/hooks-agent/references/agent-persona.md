# agentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent persona templates (role, system prompt, default skills/knowledge)

## Usage

```typescript
useAgentPersonasQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, slug: true, name: true, description: true, systemPrompt: true, resources: true, config: true, isActive: true } } })
useAgentPersonaQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, slug: true, name: true, description: true, systemPrompt: true, resources: true, config: true, isActive: true } } })
useCreateAgentPersonaMutation({ selection: { fields: { id: true } } })
useUpdateAgentPersonaMutation({ selection: { fields: { id: true } } })
useDeleteAgentPersonaMutation({})
```

## Examples

### List all agentPersonas

```typescript
const { data, isLoading } = useAgentPersonasQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, slug: true, name: true, description: true, systemPrompt: true, resources: true, config: true, isActive: true } },
});
```

### Create a agentPersona

```typescript
const { mutate } = useCreateAgentPersonaMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', slug: '<String>', name: '<String>', description: '<String>', systemPrompt: '<String>', resources: '<String>', config: '<JSON>', isActive: '<Boolean>' });
```
