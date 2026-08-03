# platformSiteDeepLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named, retargetable deep links owned by a site surface (served at the deep-link path prefix; app interception via site_app_links)

## Usage

```typescript
usePlatformSiteDeepLinksQuery({ selection: { fields: { appPath: true, createdAt: true, fallbackUrl: true, id: true, metadata: true, siteId: true, slug: true, updatedAt: true, webPath: true } } })
usePlatformSiteDeepLinkQuery({ id: '<UUID>', selection: { fields: { appPath: true, createdAt: true, fallbackUrl: true, id: true, metadata: true, siteId: true, slug: true, updatedAt: true, webPath: true } } })
useCreatePlatformSiteDeepLinkMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteDeepLinkMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteDeepLinkMutation({})
```

## Examples

### List all platformSiteDeepLinks

```typescript
const { data, isLoading } = usePlatformSiteDeepLinksQuery({
  selection: { fields: { appPath: true, createdAt: true, fallbackUrl: true, id: true, metadata: true, siteId: true, slug: true, updatedAt: true, webPath: true } },
});
```

### Create a platformSiteDeepLink

```typescript
const { mutate } = useCreatePlatformSiteDeepLinkMutation({
  selection: { fields: { id: true } },
});
mutate({ appPath: '<String>', fallbackUrl: '<String>', metadata: '<JSON>', siteId: '<UUID>', slug: '<String>', webPath: '<String>' });
```
