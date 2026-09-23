# image

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Container image catalog: images available to run as functions, resources, and builds

## Usage

```typescript
useImagesQuery({ selection: { fields: { createdAt: true, createdByPrincipal: true, databaseId: true, description: true, digest: true, expiresAt: true, id: true, isPublished: true, labels: true, metadata: true, name: true, ownerId: true, platformOnly: true, registryHost: true, repository: true, runtime: true, tag: true, updatedAt: true, updatedByPrincipal: true } } })
useImageQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdByPrincipal: true, databaseId: true, description: true, digest: true, expiresAt: true, id: true, isPublished: true, labels: true, metadata: true, name: true, ownerId: true, platformOnly: true, registryHost: true, repository: true, runtime: true, tag: true, updatedAt: true, updatedByPrincipal: true } } })
useCreateImageMutation({ selection: { fields: { id: true } } })
useUpdateImageMutation({ selection: { fields: { id: true } } })
useDeleteImageMutation({})
```

## Examples

### List all images

```typescript
const { data, isLoading } = useImagesQuery({
  selection: { fields: { createdAt: true, createdByPrincipal: true, databaseId: true, description: true, digest: true, expiresAt: true, id: true, isPublished: true, labels: true, metadata: true, name: true, ownerId: true, platformOnly: true, registryHost: true, repository: true, runtime: true, tag: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a image

```typescript
const { mutate } = useCreateImageMutation({
  selection: { fields: { id: true } },
});
mutate({ createdByPrincipal: '<UUID>', databaseId: '<UUID>', description: '<String>', digest: '<String>', expiresAt: '<Datetime>', isPublished: '<Boolean>', labels: '<JSON>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', platformOnly: '<Boolean>', registryHost: '<String>', repository: '<String>', runtime: '<String>', tag: '<String>', updatedByPrincipal: '<UUID>' });
```
