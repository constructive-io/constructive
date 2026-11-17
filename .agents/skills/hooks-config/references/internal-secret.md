# internalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InternalSecret data operations

## Usage

```typescript
useInternalSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useInternalSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useUpdateInternalSecretMutation({ selection: { fields: { id: true } } })
useDeleteInternalSecretMutation({})
```

## Examples

### List all internalSecrets

```typescript
const { data, isLoading } = useInternalSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```
