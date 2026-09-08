# siteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-host native-app association for a site surface: which app-owned store identity this host serves, and the path patterns it claims (joined with the store identity to render AASA / assetlinks.json)

## Usage

```typescript
useSiteAppLinksQuery({ selection: { fields: { appStoreIdentityId: true, createdAt: true, databaseId: true, id: true, pathComponents: true, siteId: true, updatedAt: true, webcredentials: true } } })
useSiteAppLinkQuery({ id: '<UUID>', selection: { fields: { appStoreIdentityId: true, createdAt: true, databaseId: true, id: true, pathComponents: true, siteId: true, updatedAt: true, webcredentials: true } } })
useCreateSiteAppLinkMutation({ selection: { fields: { id: true } } })
useUpdateSiteAppLinkMutation({ selection: { fields: { id: true } } })
useDeleteSiteAppLinkMutation({})
```

## Examples

### List all siteAppLinks

```typescript
const { data, isLoading } = useSiteAppLinksQuery({
  selection: { fields: { appStoreIdentityId: true, createdAt: true, databaseId: true, id: true, pathComponents: true, siteId: true, updatedAt: true, webcredentials: true } },
});
```

### Create a siteAppLink

```typescript
const { mutate } = useCreateSiteAppLinkMutation({
  selection: { fields: { id: true } },
});
mutate({ appStoreIdentityId: '<UUID>', databaseId: '<UUID>', pathComponents: '<String>', siteId: '<UUID>', webcredentials: '<Boolean>' });
```
