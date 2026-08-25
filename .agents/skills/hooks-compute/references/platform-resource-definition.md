# platformResourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
usePlatformResourceDefinitionsQuery({ selection: { fields: { annotations: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, paramsSchema: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformResourceDefinitionQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, paramsSchema: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformResourceDefinitionMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceDefinitionMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceDefinitionMutation({})
```

## Examples

### List all platformResourceDefinitions

```typescript
const { data, isLoading } = usePlatformResourceDefinitionsQuery({
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, paramsSchema: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformResourceDefinition

```typescript
const { mutate } = useCreatePlatformResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', paramsSchema: '<JSON>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
