# resourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
useResourceDefinitionsQuery({ selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } } })
useResourceDefinitionQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } } })
useCreateResourceDefinitionMutation({ selection: { fields: { id: true } } })
useUpdateResourceDefinitionMutation({ selection: { fields: { id: true } } })
useDeleteResourceDefinitionMutation({})
```

## Examples

### List all resourceDefinitions

```typescript
const { data, isLoading } = useResourceDefinitionsQuery({
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } },
});
```

### Create a resourceDefinition

```typescript
const { mutate } = useCreateResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' });
```
