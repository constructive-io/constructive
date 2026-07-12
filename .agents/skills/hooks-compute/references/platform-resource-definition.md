# platformResourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
usePlatformResourceDefinitionsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true } } })
usePlatformResourceDefinitionQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true } } })
useCreatePlatformResourceDefinitionMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceDefinitionMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceDefinitionMutation({})
```

## Examples

### List all platformResourceDefinitions

```typescript
const { data, isLoading } = usePlatformResourceDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true } },
});
```

### Create a platformResourceDefinition

```typescript
const { mutate } = useCreatePlatformResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>' });
```
