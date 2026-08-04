# platformSiteAppLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Native-app deep-link association metadata for a site surface (feeds AASA / assetlinks.json generation)

## Usage

```typescript
usePlatformSiteAppLinksQuery({ selection: { fields: { appIdentifier: true, createdAt: true, id: true, pathComponents: true, platform: true, sha256CertFingerprints: true, siteId: true, storeUrl: true, teamId: true, updatedAt: true, webcredentials: true } } })
usePlatformSiteAppLinkQuery({ id: '<UUID>', selection: { fields: { appIdentifier: true, createdAt: true, id: true, pathComponents: true, platform: true, sha256CertFingerprints: true, siteId: true, storeUrl: true, teamId: true, updatedAt: true, webcredentials: true } } })
useCreatePlatformSiteAppLinkMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteAppLinkMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteAppLinkMutation({})
```

## Examples

### List all platformSiteAppLinks

```typescript
const { data, isLoading } = usePlatformSiteAppLinksQuery({
  selection: { fields: { appIdentifier: true, createdAt: true, id: true, pathComponents: true, platform: true, sha256CertFingerprints: true, siteId: true, storeUrl: true, teamId: true, updatedAt: true, webcredentials: true } },
});
```

### Create a platformSiteAppLink

```typescript
const { mutate } = useCreatePlatformSiteAppLinkMutation({
  selection: { fields: { id: true } },
});
mutate({ appIdentifier: '<String>', pathComponents: '<String>', platform: '<String>', sha256CertFingerprints: '<String>', siteId: '<UUID>', storeUrl: '<String>', teamId: '<String>', webcredentials: '<Boolean>' });
```
