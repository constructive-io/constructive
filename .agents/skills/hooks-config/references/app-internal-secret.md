# appInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppInternalSecret data operations

## Usage

```typescript
useAppInternalSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useAppInternalSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useCreateAppInternalSecretMutation({ selection: { fields: { id: true } } })
useUpdateAppInternalSecretMutation({ selection: { fields: { id: true } } })
useDeleteAppInternalSecretMutation({})
```

## Examples

### List all appInternalSecrets

```typescript
const { data, isLoading } = useAppInternalSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, labels: true, name: true, realm: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```

### Create a appInternalSecret

```typescript
const { mutate } = useCreateAppInternalSecretMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', realm: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' });
```
