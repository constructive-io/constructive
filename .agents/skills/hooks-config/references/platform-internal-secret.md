# platformInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformInternalSecret data operations

## Usage

```typescript
usePlatformInternalSecretsQuery({ selection: { fields: { id: true, name: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } } })
usePlatformInternalSecretQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } } })
useCreatePlatformInternalSecretMutation({ selection: { fields: { id: true } } })
useUpdatePlatformInternalSecretMutation({ selection: { fields: { id: true } } })
useDeletePlatformInternalSecretMutation({})
```

## Examples

### List all platformInternalSecrets

```typescript
const { data, isLoading } = usePlatformInternalSecretsQuery({
  selection: { fields: { id: true, name: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});
```

### Create a platformInternalSecret

```typescript
const { mutate } = useCreatePlatformInternalSecretMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' });
```
