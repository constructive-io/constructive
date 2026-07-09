# platformNamespace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Logical namespace containers for grouping secrets, config, functions, and other resources

## Usage

```typescript
usePlatformNamespacesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, labels: true, annotations: true, databaseId: true, sourceDatabaseId: true, sourceScope: true, isManaged: true } } })
usePlatformNamespaceQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, labels: true, annotations: true, databaseId: true, sourceDatabaseId: true, sourceScope: true, isManaged: true } } })
useCreatePlatformNamespaceMutation({ selection: { fields: { id: true } } })
useUpdatePlatformNamespaceMutation({ selection: { fields: { id: true } } })
useDeletePlatformNamespaceMutation({})
```

## Examples

### List all platformNamespaces

```typescript
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, labels: true, annotations: true, databaseId: true, sourceDatabaseId: true, sourceScope: true, isManaged: true } },
});
```

### Create a platformNamespace

```typescript
const { mutate } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', sourceDatabaseId: '<UUID>', sourceScope: '<String>', isManaged: '<Boolean>' });
```
