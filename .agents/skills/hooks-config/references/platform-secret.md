# platformSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformSecret data operations

## Usage

```typescript
usePlatformSecretsQuery({ selection: { fields: { id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } } })
usePlatformSecretQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } } })
useCreatePlatformSecretMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSecretMutation({ selection: { fields: { id: true } } })
useDeletePlatformSecretMutation({})
```

## Examples

### List all platformSecrets

```typescript
const { data, isLoading } = usePlatformSecretsQuery({
  selection: { fields: { id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});
```

### Create a platformSecret

```typescript
const { mutate } = useCreatePlatformSecretMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' });
```
