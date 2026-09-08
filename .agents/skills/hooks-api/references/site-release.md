# siteRelease

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Immutable static-site release manifest head, versioned in the site-owned merkle store

## Usage

```typescript
useSiteReleasesQuery({ selection: { fields: { commitId: true, createdAt: true, databaseId: true, id: true, manifest: true, siteId: true, storeId: true, updatedAt: true } } })
useSiteReleaseQuery({ id: '<UUID>', selection: { fields: { commitId: true, createdAt: true, databaseId: true, id: true, manifest: true, siteId: true, storeId: true, updatedAt: true } } })
useCreateSiteReleaseMutation({ selection: { fields: { id: true } } })
useUpdateSiteReleaseMutation({ selection: { fields: { id: true } } })
useDeleteSiteReleaseMutation({})
```

## Examples

### List all siteReleases

```typescript
const { data, isLoading } = useSiteReleasesQuery({
  selection: { fields: { commitId: true, createdAt: true, databaseId: true, id: true, manifest: true, siteId: true, storeId: true, updatedAt: true } },
});
```

### Create a siteRelease

```typescript
const { mutate } = useCreateSiteReleaseMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', databaseId: '<UUID>', manifest: '<JSON>', siteId: '<UUID>', storeId: '<UUID>' });
```
