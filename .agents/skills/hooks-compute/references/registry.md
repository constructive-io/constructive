# registry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Artifact registries this scope pulls from or pushes to (OCI images, npm packages), platform-run or external

## Usage

```typescript
useRegistriesQuery({ selection: { fields: { authMode: true, basePath: true, createdAt: true, createdByPrincipal: true, credentialSecretName: true, databaseId: true, host: true, id: true, installationId: true, isPublished: true, kind: true, labels: true, lastError: true, metadata: true, name: true, platformOnly: true, role: true, status: true, updatedAt: true, updatedByPrincipal: true } } })
useRegistryQuery({ id: '<UUID>', selection: { fields: { authMode: true, basePath: true, createdAt: true, createdByPrincipal: true, credentialSecretName: true, databaseId: true, host: true, id: true, installationId: true, isPublished: true, kind: true, labels: true, lastError: true, metadata: true, name: true, platformOnly: true, role: true, status: true, updatedAt: true, updatedByPrincipal: true } } })
useCreateRegistryMutation({ selection: { fields: { id: true } } })
useUpdateRegistryMutation({ selection: { fields: { id: true } } })
useDeleteRegistryMutation({})
```

## Examples

### List all registries

```typescript
const { data, isLoading } = useRegistriesQuery({
  selection: { fields: { authMode: true, basePath: true, createdAt: true, createdByPrincipal: true, credentialSecretName: true, databaseId: true, host: true, id: true, installationId: true, isPublished: true, kind: true, labels: true, lastError: true, metadata: true, name: true, platformOnly: true, role: true, status: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a registry

```typescript
const { mutate } = useCreateRegistryMutation({
  selection: { fields: { id: true } },
});
mutate({ authMode: '<String>', basePath: '<String>', createdByPrincipal: '<UUID>', credentialSecretName: '<String>', databaseId: '<UUID>', host: '<String>', installationId: '<UUID>', isPublished: '<Boolean>', kind: '<String>', labels: '<JSON>', lastError: '<String>', metadata: '<JSON>', name: '<String>', platformOnly: '<Boolean>', role: '<String>', status: '<String>', updatedByPrincipal: '<UUID>' });
```
