# resourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
useResourceDefinitionsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true, databaseId: true } } })
useResourceDefinitionQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true, databaseId: true } } })
useCreateResourceDefinitionMutation({ selection: { fields: { id: true } } })
useUpdateResourceDefinitionMutation({ selection: { fields: { id: true } } })
useDeleteResourceDefinitionMutation({})
```

## Examples

### List all resourceDefinitions

```typescript
const { data, isLoading } = useResourceDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true, databaseId: true } },
});
```

### Create a resourceDefinition

```typescript
const { mutate } = useCreateResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>', databaseId: '<UUID>' });
```
