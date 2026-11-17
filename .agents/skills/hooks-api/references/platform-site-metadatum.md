# platformSiteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site surface

## Usage

```typescript
usePlatformSiteMetadataQuery({ selection: { fields: { appleTouchIcon: true, appleTouchIconUrl: true, appleTouchIconVersions: true, canonicalUrl: true, commitId: true, createdAt: true, description: true, favicon: true, faviconUrl: true, faviconVersions: true, id: true, logo: true, logoUrl: true, logoVersions: true, ogImage: true, ogImageUrl: true, ogImageVersions: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
usePlatformSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { appleTouchIcon: true, appleTouchIconUrl: true, appleTouchIconVersions: true, canonicalUrl: true, commitId: true, createdAt: true, description: true, favicon: true, faviconUrl: true, faviconVersions: true, id: true, logo: true, logoUrl: true, logoVersions: true, ogImage: true, ogImageUrl: true, ogImageVersions: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
useCreatePlatformSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteMetadatumMutation({})
```

## Examples

### List all platformSiteMetadata

```typescript
const { data, isLoading } = usePlatformSiteMetadataQuery({
  selection: { fields: { appleTouchIcon: true, appleTouchIconUrl: true, appleTouchIconVersions: true, canonicalUrl: true, commitId: true, createdAt: true, description: true, favicon: true, faviconUrl: true, faviconVersions: true, id: true, logo: true, logoUrl: true, logoVersions: true, ogImage: true, ogImageUrl: true, ogImageVersions: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } },
});
```

### Create a platformSiteMetadatum

```typescript
const { mutate } = useCreatePlatformSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ appleTouchIcon: '<Image>', appleTouchIconUrl: '<String>', appleTouchIconVersions: '<FileVersion>', canonicalUrl: '<String>', commitId: '<UUID>', description: '<String>', favicon: '<Image>', faviconUrl: '<String>', faviconVersions: '<FileVersion>', logo: '<Image>', logoUrl: '<String>', logoVersions: '<FileVersion>', ogImage: '<Image>', ogImageUrl: '<String>', ogImageVersions: '<FileVersion>', robots: '<String>', robotsSeededFrom: '<JSON>', siteId: '<UUID>', storeId: '<UUID>', title: '<String>' });
```
