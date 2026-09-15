# platformResourceInstallation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback

## Usage

```typescript
usePlatformResourceInstallationsQuery({ selection: { fields: { commitId: true, createdAt: true, createdBy: true, createdByPrincipal: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformResourceInstallationQuery({ id: '<UUID>', selection: { fields: { commitId: true, createdAt: true, createdBy: true, createdByPrincipal: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformResourceInstallationMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceInstallationMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceInstallationMutation({})
```

## Examples

### List all platformResourceInstallations

```typescript
const { data, isLoading } = usePlatformResourceInstallationsQuery({
  selection: { fields: { commitId: true, createdAt: true, createdBy: true, createdByPrincipal: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformResourceInstallation

```typescript
const { mutate } = useCreatePlatformResourceInstallationMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
