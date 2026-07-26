# platformSite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
usePlatformSitesQuery({ selection: { fields: { config: true, createdAt: true, description: true, id: true, isPublished: true, name: true, title: true, updatedAt: true } } })
usePlatformSiteQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, description: true, id: true, isPublished: true, name: true, title: true, updatedAt: true } } })
useCreatePlatformSiteMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteMutation({})
```

## Examples

### List all platformSites

```typescript
const { data, isLoading } = usePlatformSitesQuery({
  selection: { fields: { config: true, createdAt: true, description: true, id: true, isPublished: true, name: true, title: true, updatedAt: true } },
});
```

### Create a platformSite

```typescript
const { mutate } = useCreatePlatformSiteMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', description: '<String>', isPublished: '<Boolean>', name: '<String>', title: '<String>' });
```
