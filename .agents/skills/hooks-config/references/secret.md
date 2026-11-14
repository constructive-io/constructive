# secret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Secret data operations

## Usage

```typescript
useSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useUpdateSecretMutation({ selection: { fields: { id: true } } })
useDeleteSecretMutation({})
```

## Examples

### List all secrets

```typescript
const { data, isLoading } = useSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```
