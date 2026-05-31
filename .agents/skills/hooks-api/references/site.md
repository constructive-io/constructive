# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level site configuration: branding assets, title, and description for a deployed application

## Usage

```typescript
useSitesQuery({ selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } } })
useSiteQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } } })
useCreateSiteMutation({ selection: { fields: { id: true } } })
useUpdateSiteMutation({ selection: { fields: { id: true } } })
useDeleteSiteMutation({})
```

## Examples

### List all sites

```typescript
const { data, isLoading } = useSitesQuery({
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } },
});
```

### Create a site

```typescript
const { mutate } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>', favicon: '<Attachment>', appleTouchIcon: '<Image>', logo: '<Image>', dbname: '<String>' });
```
