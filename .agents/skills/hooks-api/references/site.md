# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level site configuration: branding assets, title, and description for a deployed application

## Usage

```typescript
useSitesQuery({ selection: { fields: { annotations: true, appleTouchIcon: true, databaseId: true, dbname: true, description: true, favicon: true, id: true, labels: true, logo: true, ogImage: true, title: true } } })
useSiteQuery({ id: '<UUID>', selection: { fields: { annotations: true, appleTouchIcon: true, databaseId: true, dbname: true, description: true, favicon: true, id: true, labels: true, logo: true, ogImage: true, title: true } } })
useCreateSiteMutation({ selection: { fields: { id: true } } })
useUpdateSiteMutation({ selection: { fields: { id: true } } })
useDeleteSiteMutation({})
```

## Examples

### List all sites

```typescript
const { data, isLoading } = useSitesQuery({
  selection: { fields: { annotations: true, appleTouchIcon: true, databaseId: true, dbname: true, description: true, favicon: true, id: true, labels: true, logo: true, ogImage: true, title: true } },
});
```

### Create a site

```typescript
const { mutate } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', appleTouchIcon: '<Image>', databaseId: '<UUID>', dbname: '<String>', description: '<String>', favicon: '<Attachment>', labels: '<JSON>', logo: '<Image>', ogImage: '<Image>', title: '<String>' });
```
