# platformSiteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-host native-app association for a site surface: which app-owned store identity this host serves, and the path patterns it claims (joined with the store identity to render AASA / assetlinks.json)

## Usage

```typescript
usePlatformSiteAppLinksQuery({ selection: { fields: { appStoreIdentityId: true, createdAt: true, id: true, pathComponents: true, siteId: true, updatedAt: true, webcredentials: true } } })
usePlatformSiteAppLinkQuery({ id: '<UUID>', selection: { fields: { appStoreIdentityId: true, createdAt: true, id: true, pathComponents: true, siteId: true, updatedAt: true, webcredentials: true } } })
useCreatePlatformSiteAppLinkMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteAppLinkMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteAppLinkMutation({})
```

## Examples

### List all platformSiteAppLinks

```typescript
const { data, isLoading } = usePlatformSiteAppLinksQuery({
  selection: { fields: { appStoreIdentityId: true, createdAt: true, id: true, pathComponents: true, siteId: true, updatedAt: true, webcredentials: true } },
});
```

### Create a platformSiteAppLink

```typescript
const { mutate } = useCreatePlatformSiteAppLinkMutation({
  selection: { fields: { id: true } },
});
mutate({ appStoreIdentityId: '<UUID>', pathComponents: '<String>', siteId: '<UUID>', webcredentials: '<Boolean>' });
```
