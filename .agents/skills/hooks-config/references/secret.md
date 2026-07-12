# secret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Secret data operations

## Usage

```typescript
useSecretsQuery({ selection: { fields: { databaseId: true, id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } } })
useSecretQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } } })
useCreateSecretMutation({ selection: { fields: { id: true } } })
useUpdateSecretMutation({ selection: { fields: { id: true } } })
useDeleteSecretMutation({})
```

## Examples

### List all secrets

```typescript
const { data, isLoading } = useSecretsQuery({
  selection: { fields: { databaseId: true, id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});
```

### Create a secret

```typescript
const { mutate } = useCreateSecretMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' });
```
