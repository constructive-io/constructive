# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site: page title, description, and Open Graph image

## Usage

```typescript
useSiteMetadataQuery({ selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } } })
useSiteMetadatumQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } } })
useCreateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useUpdateSiteMetadatumMutation({ selection: { fields: { id: true } } })
useDeleteSiteMetadatumMutation({})
```

## Examples

### List all siteMetadata

```typescript
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } },
});
```

### Create a siteMetadatum

```typescript
const { mutate } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', siteId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>' });
```
