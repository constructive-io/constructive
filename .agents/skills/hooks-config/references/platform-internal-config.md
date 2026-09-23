# platformInternalConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

platform-level plaintext key-value config store; database-resident, never projected into Kubernetes

## Usage

```typescript
usePlatformInternalConfigsQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, provider: true, realm: true, updatedAt: true, value: true } } })
usePlatformInternalConfigQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, provider: true, realm: true, updatedAt: true, value: true } } })
useCreatePlatformInternalConfigMutation({ selection: { fields: { id: true } } })
useUpdatePlatformInternalConfigMutation({ selection: { fields: { id: true } } })
useDeletePlatformInternalConfigMutation({})
```

## Examples

### List all platformInternalConfigs

```typescript
const { data, isLoading } = usePlatformInternalConfigsQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, provider: true, realm: true, updatedAt: true, value: true } },
});
```

### Create a platformInternalConfig

```typescript
const { mutate } = useCreatePlatformInternalConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', provider: '<String>', realm: '<String>', value: '<String>' });
```
