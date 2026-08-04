# siteDeepLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named, retargetable deep links owned by a site surface (served at the deep-link path prefix; app interception via site_app_links)

## Usage

```typescript
useSiteDeepLinksQuery({ selection: { fields: { appPath: true, createdAt: true, databaseId: true, fallbackUrl: true, id: true, metadata: true, siteId: true, slug: true, updatedAt: true, webPath: true } } })
useSiteDeepLinkQuery({ id: '<UUID>', selection: { fields: { appPath: true, createdAt: true, databaseId: true, fallbackUrl: true, id: true, metadata: true, siteId: true, slug: true, updatedAt: true, webPath: true } } })
useCreateSiteDeepLinkMutation({ selection: { fields: { id: true } } })
useUpdateSiteDeepLinkMutation({ selection: { fields: { id: true } } })
useDeleteSiteDeepLinkMutation({})
```

## Examples

### List all siteDeepLinks

```typescript
const { data, isLoading } = useSiteDeepLinksQuery({
  selection: { fields: { appPath: true, createdAt: true, databaseId: true, fallbackUrl: true, id: true, metadata: true, siteId: true, slug: true, updatedAt: true, webPath: true } },
});
```

### Create a siteDeepLink

```typescript
const { mutate } = useCreateSiteDeepLinkMutation({
  selection: { fields: { id: true } },
});
mutate({ appPath: '<String>', databaseId: '<UUID>', fallbackUrl: '<String>', metadata: '<JSON>', siteId: '<UUID>', slug: '<String>', webPath: '<String>' });
```
