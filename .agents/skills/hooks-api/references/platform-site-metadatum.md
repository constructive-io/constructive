# platformSiteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site surface

## Usage

```typescript
usePlatformSiteMetadataQuery({ selection: { fields: { createdAt: true, description: true, id: true, ogImage: true, siteId: true, title: true, updatedAt: true } } })
usePlatformSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { createdAt: true, description: true, id: true, ogImage: true, siteId: true, title: true, updatedAt: true } } })
useCreatePlatformSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteMetadatumMutation({})
```

## Examples

### List all platformSiteMetadata

```typescript
const { data, isLoading } = usePlatformSiteMetadataQuery({
  selection: { fields: { createdAt: true, description: true, id: true, ogImage: true, siteId: true, title: true, updatedAt: true } },
});
```

### Create a platformSiteMetadatum

```typescript
const { mutate } = useCreatePlatformSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ description: '<String>', ogImage: '<Image>', siteId: '<UUID>', title: '<String>' });
```
