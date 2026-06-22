# secretDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Global secret name registry — declares which secrets the platform recognizes. Actual values live in app_secrets.

## Usage

```typescript
useSecretDefinitionsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, isBuiltIn: true, labels: true, annotations: true, databaseId: true } } })
useSecretDefinitionQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, isBuiltIn: true, labels: true, annotations: true, databaseId: true } } })
useCreateSecretDefinitionMutation({ selection: { fields: { id: true } } })
useUpdateSecretDefinitionMutation({ selection: { fields: { id: true } } })
useDeleteSecretDefinitionMutation({})
```

## Examples

### List all secretDefinitions

```typescript
const { data, isLoading } = useSecretDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, isBuiltIn: true, labels: true, annotations: true, databaseId: true } },
});
```

### Create a secretDefinition

```typescript
const { mutate } = useCreateSecretDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', description: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' });
```
