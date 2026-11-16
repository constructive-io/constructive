# platformInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformInternalSecret data operations

## Usage

```typescript
usePlatformInternalSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
usePlatformInternalSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useUpdatePlatformInternalSecretMutation({ selection: { fields: { id: true } } })
useDeletePlatformInternalSecretMutation({})
```

## Examples

### List all platformInternalSecrets

```typescript
const { data, isLoading } = usePlatformInternalSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```
