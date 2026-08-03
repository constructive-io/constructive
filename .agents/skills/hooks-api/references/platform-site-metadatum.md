# platformSiteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site surface

## Usage

```typescript
usePlatformSiteMetadataQuery({ selection: { fields: { appleTouchIcon: true, canonicalUrl: true, commitId: true, createdAt: true, description: true, favicon: true, id: true, logo: true, ogImage: true, robots: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
usePlatformSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { appleTouchIcon: true, canonicalUrl: true, commitId: true, createdAt: true, description: true, favicon: true, id: true, logo: true, ogImage: true, robots: true, siteId: true, storeId: true, title: true, updatedAt: true } } })
useCreatePlatformSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteMetadatumMutation({})
```

## Examples

### List all platformSiteMetadata

```typescript
const { data, isLoading } = usePlatformSiteMetadataQuery({
  selection: { fields: { appleTouchIcon: true, canonicalUrl: true, commitId: true, createdAt: true, description: true, favicon: true, id: true, logo: true, ogImage: true, robots: true, siteId: true, storeId: true, title: true, updatedAt: true } },
});
```

### Create a platformSiteMetadatum

```typescript
const { mutate } = useCreatePlatformSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ appleTouchIcon: '<Image>', canonicalUrl: '<String>', commitId: '<UUID>', description: '<String>', favicon: '<Image>', logo: '<Image>', ogImage: '<Image>', robots: '<String>', siteId: '<UUID>', storeId: '<UUID>', title: '<String>' });
```
