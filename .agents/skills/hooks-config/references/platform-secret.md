# platformSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformSecret data operations

## Usage

```typescript
usePlatformSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
usePlatformSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useCreatePlatformSecretMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSecretMutation({ selection: { fields: { id: true } } })
useDeletePlatformSecretMutation({})
```

## Examples

### List all platformSecrets

```typescript
const { data, isLoading } = usePlatformSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```

### Create a platformSecret

```typescript
const { mutate } = useCreatePlatformSecretMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' });
```
