# platformSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformSecret data operations

## Usage

```typescript
usePlatformSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
usePlatformSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useUpdatePlatformSecretMutation({ selection: { fields: { id: true } } })
useDeletePlatformSecretMutation({})
```

## Examples

### List all platformSecrets

```typescript
const { data, isLoading } = usePlatformSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```
