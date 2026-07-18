# resourceInstallation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback

## Usage

```typescript
useResourceInstallationsQuery({ selection: { fields: { commitId: true, createdAt: true, createdBy: true, databaseId: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } } })
useResourceInstallationQuery({ id: '<UUID>', selection: { fields: { commitId: true, createdAt: true, createdBy: true, databaseId: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } } })
useCreateResourceInstallationMutation({ selection: { fields: { id: true } } })
useUpdateResourceInstallationMutation({ selection: { fields: { id: true } } })
useDeleteResourceInstallationMutation({})
```

## Examples

### List all resourceInstallations

```typescript
const { data, isLoading } = useResourceInstallationsQuery({
  selection: { fields: { commitId: true, createdAt: true, createdBy: true, databaseId: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } },
});
```

### Create a resourceInstallation

```typescript
const { mutate } = useCreateResourceInstallationMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', createdBy: '<UUID>', databaseId: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' });
```
