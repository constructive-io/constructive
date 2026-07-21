# platformConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed

## Usage

```typescript
usePlatformConfigsQuery({ selection: { fields: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } } })
usePlatformConfigQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } } })
useCreatePlatformConfigMutation({ selection: { fields: { id: true } } })
useUpdatePlatformConfigMutation({ selection: { fields: { id: true } } })
useDeletePlatformConfigMutation({})
```

## Examples

### List all platformConfigs

```typescript
const { data, isLoading } = usePlatformConfigsQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } },
});
```

### Create a platformConfig

```typescript
const { mutate } = useCreatePlatformConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', value: '<String>' });
```
