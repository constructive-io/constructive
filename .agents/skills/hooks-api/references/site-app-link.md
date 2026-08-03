# siteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Native-app deep-link association metadata for a site surface (feeds AASA / assetlinks.json generation)

## Usage

```typescript
useSiteAppLinksQuery({ selection: { fields: { appIdentifier: true, createdAt: true, databaseId: true, id: true, pathComponents: true, platform: true, sha256CertFingerprints: true, siteId: true, storeUrl: true, teamId: true, updatedAt: true, webcredentials: true } } })
useSiteAppLinkQuery({ id: '<UUID>', selection: { fields: { appIdentifier: true, createdAt: true, databaseId: true, id: true, pathComponents: true, platform: true, sha256CertFingerprints: true, siteId: true, storeUrl: true, teamId: true, updatedAt: true, webcredentials: true } } })
useCreateSiteAppLinkMutation({ selection: { fields: { id: true } } })
useUpdateSiteAppLinkMutation({ selection: { fields: { id: true } } })
useDeleteSiteAppLinkMutation({})
```

## Examples

### List all siteAppLinks

```typescript
const { data, isLoading } = useSiteAppLinksQuery({
  selection: { fields: { appIdentifier: true, createdAt: true, databaseId: true, id: true, pathComponents: true, platform: true, sha256CertFingerprints: true, siteId: true, storeUrl: true, teamId: true, updatedAt: true, webcredentials: true } },
});
```

### Create a siteAppLink

```typescript
const { mutate } = useCreateSiteAppLinkMutation({
  selection: { fields: { id: true } },
});
mutate({ appIdentifier: '<String>', databaseId: '<UUID>', pathComponents: '<String>', platform: '<String>', sha256CertFingerprints: '<String>', siteId: '<UUID>', storeUrl: '<String>', teamId: '<String>', webcredentials: '<Boolean>' });
```
