# resourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
useResourceDefinitionsQuery({ selection: { fields: { annotations: true, catalogImageId: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, paramsSchema: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useResourceDefinitionQuery({ id: '<UUID>', selection: { fields: { annotations: true, catalogImageId: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, paramsSchema: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateResourceDefinitionMutation({ selection: { fields: { id: true } } })
useUpdateResourceDefinitionMutation({ selection: { fields: { id: true } } })
useDeleteResourceDefinitionMutation({})
```

## Examples

### List all resourceDefinitions

```typescript
const { data, isLoading } = useResourceDefinitionsQuery({
  selection: { fields: { annotations: true, catalogImageId: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, paramsSchema: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a resourceDefinition

```typescript
const { mutate } = useCreateResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', catalogImageId: '<UUID>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', paramsSchema: '<JSON>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
