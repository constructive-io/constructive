# config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed

## Usage

```typescript
useConfigsQuery({ selection: { fields: { id: true, namespaceId: true, databaseId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } } })
useConfigQuery({ id: '<UUID>', selection: { fields: { id: true, namespaceId: true, databaseId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } } })
useCreateConfigMutation({ selection: { fields: { id: true } } })
useUpdateConfigMutation({ selection: { fields: { id: true } } })
useDeleteConfigMutation({})
```

## Examples

### List all configs

```typescript
const { data, isLoading } = useConfigsQuery({
  selection: { fields: { id: true, namespaceId: true, databaseId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});
```

### Create a config

```typescript
const { mutate } = useCreateConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ namespaceId: '<UUID>', databaseId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' });
```
