# platformSiteRelease

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Immutable static-site release manifest head, versioned in the site-owned merkle store

## Usage

```typescript
usePlatformSiteReleasesQuery({ selection: { fields: { commitId: true, createdAt: true, id: true, manifest: true, siteId: true, storeId: true, updatedAt: true } } })
usePlatformSiteReleaseQuery({ id: '<UUID>', selection: { fields: { commitId: true, createdAt: true, id: true, manifest: true, siteId: true, storeId: true, updatedAt: true } } })
useCreatePlatformSiteReleaseMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteReleaseMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteReleaseMutation({})
```

## Examples

### List all platformSiteReleases

```typescript
const { data, isLoading } = usePlatformSiteReleasesQuery({
  selection: { fields: { commitId: true, createdAt: true, id: true, manifest: true, siteId: true, storeId: true, updatedAt: true } },
});
```

### Create a platformSiteRelease

```typescript
const { mutate } = useCreatePlatformSiteReleaseMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', manifest: '<JSON>', siteId: '<UUID>', storeId: '<UUID>' });
```
