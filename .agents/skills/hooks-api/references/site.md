# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
useSitesQuery({ selection: { fields: { activeCommitId: true, bucketId: true, createdAt: true, databaseId: true, description: true, id: true, installationId: true, installationMemberSlug: true, isPublished: true, name: true, resourceId: true, title: true, updatedAt: true } } })
useSiteQuery({ id: '<UUID>', selection: { fields: { activeCommitId: true, bucketId: true, createdAt: true, databaseId: true, description: true, id: true, installationId: true, installationMemberSlug: true, isPublished: true, name: true, resourceId: true, title: true, updatedAt: true } } })
useCreateSiteMutation({ selection: { fields: { id: true } } })
useUpdateSiteMutation({ selection: { fields: { id: true } } })
useDeleteSiteMutation({})
```

## Examples

### List all sites

```typescript
const { data, isLoading } = useSitesQuery({
  selection: { fields: { activeCommitId: true, bucketId: true, createdAt: true, databaseId: true, description: true, id: true, installationId: true, installationMemberSlug: true, isPublished: true, name: true, resourceId: true, title: true, updatedAt: true } },
});
```

### Create a site

```typescript
const { mutate } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
mutate({ activeCommitId: '<UUID>', bucketId: '<UUID>', databaseId: '<UUID>', description: '<String>', installationId: '<UUID>', installationMemberSlug: '<String>', isPublished: '<Boolean>', name: '<String>', resourceId: '<UUID>', title: '<String>' });
```
