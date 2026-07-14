# secret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Secret data operations

## Usage

```typescript
useSecretsQuery({ selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useSecretQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } } })
useCreateSecretMutation({ selection: { fields: { id: true } } })
useUpdateSecretMutation({ selection: { fields: { id: true } } })
useDeleteSecretMutation({})
```

## Examples

### List all secrets

```typescript
const { data, isLoading } = useSecretsQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, labels: true, name: true, namespaceId: true, provider: true, retiredAt: true, rotatedAt: true, updatedAt: true } },
});
```

### Create a secret

```typescript
const { mutate } = useCreateSecretMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' });
```
