# agentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent persona templates (role, system prompt, default skills/knowledge)

## Usage

```typescript
useAgentPersonasQuery({ selection: { fields: { config: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true } } })
useAgentPersonaQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true } } })
useCreateAgentPersonaMutation({ selection: { fields: { id: true } } })
useUpdateAgentPersonaMutation({ selection: { fields: { id: true } } })
useDeleteAgentPersonaMutation({})
```

## Examples

### List all agentPersonas

```typescript
const { data, isLoading } = useAgentPersonasQuery({
  selection: { fields: { config: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true } },
});
```

### Create a agentPersona

```typescript
const { mutate } = useCreateAgentPersonaMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>' });
```
