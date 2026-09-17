# internalConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

-level plaintext key-value config store; database-resident, never projected into Kubernetes

## Usage

```typescript
useInternalConfigsQuery({ selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, provider: true, realm: true, updatedAt: true, value: true } } })
useInternalConfigQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, provider: true, realm: true, updatedAt: true, value: true } } })
useCreateInternalConfigMutation({ selection: { fields: { id: true } } })
useUpdateInternalConfigMutation({ selection: { fields: { id: true } } })
useDeleteInternalConfigMutation({})
```

## Examples

### List all internalConfigs

```typescript
const { data, isLoading } = useInternalConfigsQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, expiresAt: true, id: true, labels: true, name: true, provider: true, realm: true, updatedAt: true, value: true } },
});
```

### Create a internalConfig

```typescript
const { mutate } = useCreateInternalConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', provider: '<String>', realm: '<String>', value: '<String>' });
```
