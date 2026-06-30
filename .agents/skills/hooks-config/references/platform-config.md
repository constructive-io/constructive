# platformConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App-level plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed

## Usage

```typescript
usePlatformConfigsQuery({ selection: { fields: { id: true, namespaceId: true, name: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } } })
usePlatformConfigQuery({ id: '<UUID>', selection: { fields: { id: true, namespaceId: true, name: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } } })
useCreatePlatformConfigMutation({ selection: { fields: { id: true } } })
useUpdatePlatformConfigMutation({ selection: { fields: { id: true } } })
useDeletePlatformConfigMutation({})
```

## Examples

### List all platformConfigs

```typescript
const { data, isLoading } = usePlatformConfigsQuery({
  selection: { fields: { id: true, namespaceId: true, name: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});
```

### Create a platformConfig

```typescript
const { mutate } = useCreatePlatformConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ namespaceId: '<UUID>', name: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' });
```
