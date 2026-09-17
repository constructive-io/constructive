# platformImage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Container image catalog: images available to run as functions, resources, and builds

## Usage

```typescript
usePlatformImagesQuery({ selection: { fields: { createdAt: true, createdByPrincipal: true, description: true, digest: true, expiresAt: true, id: true, isPublished: true, labels: true, metadata: true, name: true, ownerId: true, platformOnly: true, registryHost: true, repository: true, runtime: true, tag: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformImageQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdByPrincipal: true, description: true, digest: true, expiresAt: true, id: true, isPublished: true, labels: true, metadata: true, name: true, ownerId: true, platformOnly: true, registryHost: true, repository: true, runtime: true, tag: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformImageMutation({ selection: { fields: { id: true } } })
useUpdatePlatformImageMutation({ selection: { fields: { id: true } } })
useDeletePlatformImageMutation({})
```

## Examples

### List all platformImages

```typescript
const { data, isLoading } = usePlatformImagesQuery({
  selection: { fields: { createdAt: true, createdByPrincipal: true, description: true, digest: true, expiresAt: true, id: true, isPublished: true, labels: true, metadata: true, name: true, ownerId: true, platformOnly: true, registryHost: true, repository: true, runtime: true, tag: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformImage

```typescript
const { mutate } = useCreatePlatformImageMutation({
  selection: { fields: { id: true } },
});
mutate({ createdByPrincipal: '<UUID>', description: '<String>', digest: '<String>', expiresAt: '<Datetime>', isPublished: '<Boolean>', labels: '<JSON>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', platformOnly: '<Boolean>', registryHost: '<String>', repository: '<String>', runtime: '<String>', tag: '<String>', updatedByPrincipal: '<UUID>' });
```
