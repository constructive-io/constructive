# config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed

## Usage

```typescript
useConfigsQuery({ selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } } })
useConfigQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } } })
useCreateConfigMutation({ selection: { fields: { id: true } } })
useUpdateConfigMutation({ selection: { fields: { id: true } } })
useDeleteConfigMutation({})
```

## Examples

### List all configs

```typescript
const { data, isLoading } = useConfigsQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, namespaceId: true, provider: true, updatedAt: true, value: true } },
});
```

### Create a config

```typescript
const { mutate } = useCreateConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', value: '<String>' });
```
