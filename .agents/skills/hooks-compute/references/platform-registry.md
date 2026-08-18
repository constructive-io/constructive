# platformRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Artifact registries this scope pulls from or pushes to (OCI images, npm packages), platform-run or external

## Usage

```typescript
usePlatformRegistriesQuery({ selection: { fields: { authMode: true, basePath: true, createdAt: true, createdByPrincipal: true, credentialSecretName: true, host: true, id: true, installationId: true, isPublished: true, kind: true, labels: true, lastError: true, metadata: true, name: true, platformOnly: true, role: true, status: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformRegistryQuery({ id: '<UUID>', selection: { fields: { authMode: true, basePath: true, createdAt: true, createdByPrincipal: true, credentialSecretName: true, host: true, id: true, installationId: true, isPublished: true, kind: true, labels: true, lastError: true, metadata: true, name: true, platformOnly: true, role: true, status: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformRegistryMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRegistryMutation({ selection: { fields: { id: true } } })
useDeletePlatformRegistryMutation({})
```

## Examples

### List all platformRegistries

```typescript
const { data, isLoading } = usePlatformRegistriesQuery({
  selection: { fields: { authMode: true, basePath: true, createdAt: true, createdByPrincipal: true, credentialSecretName: true, host: true, id: true, installationId: true, isPublished: true, kind: true, labels: true, lastError: true, metadata: true, name: true, platformOnly: true, role: true, status: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformRegistry

```typescript
const { mutate } = useCreatePlatformRegistryMutation({
  selection: { fields: { id: true } },
});
mutate({ authMode: '<String>', basePath: '<String>', createdByPrincipal: '<UUID>', credentialSecretName: '<String>', host: '<String>', installationId: '<UUID>', isPublished: '<Boolean>', kind: '<String>', labels: '<JSON>', lastError: '<String>', metadata: '<JSON>', name: '<String>', platformOnly: '<Boolean>', role: '<String>', status: '<String>', updatedByPrincipal: '<UUID>' });
```
