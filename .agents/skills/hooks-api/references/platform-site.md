# platformSite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
usePlatformSitesQuery({ selection: { fields: { activeCommitId: true, bucketId: true, createdAt: true, createdByPrincipal: true, description: true, id: true, installationId: true, installationMemberSlug: true, isPublished: true, name: true, resourceId: true, title: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformSiteQuery({ id: '<UUID>', selection: { fields: { activeCommitId: true, bucketId: true, createdAt: true, createdByPrincipal: true, description: true, id: true, installationId: true, installationMemberSlug: true, isPublished: true, name: true, resourceId: true, title: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformSiteMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteMutation({})
```

## Examples

### List all platformSites

```typescript
const { data, isLoading } = usePlatformSitesQuery({
  selection: { fields: { activeCommitId: true, bucketId: true, createdAt: true, createdByPrincipal: true, description: true, id: true, installationId: true, installationMemberSlug: true, isPublished: true, name: true, resourceId: true, title: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformSite

```typescript
const { mutate } = useCreatePlatformSiteMutation({
  selection: { fields: { id: true } },
});
mutate({ activeCommitId: '<UUID>', bucketId: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', installationId: '<UUID>', installationMemberSlug: '<String>', isPublished: '<Boolean>', name: '<String>', resourceId: '<UUID>', title: '<String>', updatedByPrincipal: '<UUID>' });
```
