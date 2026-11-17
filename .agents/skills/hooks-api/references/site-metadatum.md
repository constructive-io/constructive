# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site surface

## Usage

```typescript
useSiteMetadataQuery({ selection: { fields: { appleTouchIcon: true, appleTouchIconUrl: true, appleTouchIconVersions: true, canonicalUrl: true, commitId: true, createdAt: true, databaseId: true, description: true, favicon: true, faviconUrl: true, faviconVersions: true, id: true, logo: true, logoUrl: true, logoVersions: true, ogImage: true, ogImageUrl: true, ogImageVersions: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
useSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { appleTouchIcon: true, appleTouchIconUrl: true, appleTouchIconVersions: true, canonicalUrl: true, commitId: true, createdAt: true, databaseId: true, description: true, favicon: true, faviconUrl: true, faviconVersions: true, id: true, logo: true, logoUrl: true, logoVersions: true, ogImage: true, ogImageUrl: true, ogImageVersions: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
useCreateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeleteSiteMetadatumMutation({})
```

## Examples

### List all siteMetadata

```typescript
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { appleTouchIcon: true, appleTouchIconUrl: true, appleTouchIconVersions: true, canonicalUrl: true, commitId: true, createdAt: true, databaseId: true, description: true, favicon: true, faviconUrl: true, faviconVersions: true, id: true, logo: true, logoUrl: true, logoVersions: true, ogImage: true, ogImageUrl: true, ogImageVersions: true, robots: true, robotsSeededFrom: true, siteId: true, storeId: true, title: true, updatedAt: true } },
});
```

### Create a siteMetadatum

```typescript
const { mutate } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ appleTouchIcon: '<Image>', appleTouchIconUrl: '<String>', appleTouchIconVersions: '<FileVersion>', canonicalUrl: '<String>', commitId: '<UUID>', databaseId: '<UUID>', description: '<String>', favicon: '<Image>', faviconUrl: '<String>', faviconVersions: '<FileVersion>', logo: '<Image>', logoUrl: '<String>', logoVersions: '<FileVersion>', ogImage: '<Image>', ogImageUrl: '<String>', ogImageVersions: '<FileVersion>', robots: '<String>', robotsSeededFrom: '<JSON>', siteId: '<UUID>', storeId: '<UUID>', title: '<String>' });
```
