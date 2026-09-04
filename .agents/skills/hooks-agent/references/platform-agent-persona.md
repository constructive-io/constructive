# platformAgentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent persona templates (role, system prompt, default skills/knowledge)

## Usage

```typescript
usePlatformAgentPersonasQuery({ selection: { fields: { config: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformAgentPersonaQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformAgentPersonaMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentPersonaMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentPersonaMutation({})
```

## Examples

### List all platformAgentPersonas

```typescript
const { data, isLoading } = usePlatformAgentPersonasQuery({
  selection: { fields: { config: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformAgentPersona

```typescript
const { mutate } = useCreatePlatformAgentPersonaMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
