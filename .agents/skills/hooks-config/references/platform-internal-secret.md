# platformInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformInternalSecret data operations

## Usage

```typescript
usePlatformInternalSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
usePlatformInternalSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useCreatePlatformInternalSecretMutation({ selection: { fields: { id: true } } })
useUpdatePlatformInternalSecretMutation({ selection: { fields: { id: true } } })
useDeletePlatformInternalSecretMutation({})
```

## Examples

### List all platformInternalSecrets

```typescript
const { data, isLoading } = usePlatformInternalSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, namespaceId: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```

### Create a platformInternalSecret

```typescript
const { mutate } = useCreatePlatformInternalSecretMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' });
```
