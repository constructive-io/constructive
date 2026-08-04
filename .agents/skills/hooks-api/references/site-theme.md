# siteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Theme (colors, fonts, design tokens) for a site surface

## Usage

```typescript
useSiteThemesQuery({ selection: { fields: { commitId: true, createdAt: true, databaseId: true, id: true, isActive: true, name: true, siteId: true, storeId: true, theme: true, updatedAt: true } } })
useSiteThemeQuery({ id: '<UUID>', selection: { fields: { commitId: true, createdAt: true, databaseId: true, id: true, isActive: true, name: true, siteId: true, storeId: true, theme: true, updatedAt: true } } })
useCreateSiteThemeMutation({ selection: { fields: { id: true } } })
useUpdateSiteThemeMutation({ selection: { fields: { id: true } } })
useDeleteSiteThemeMutation({})
```

## Examples

### List all siteThemes

```typescript
const { data, isLoading } = useSiteThemesQuery({
  selection: { fields: { commitId: true, createdAt: true, databaseId: true, id: true, isActive: true, name: true, siteId: true, storeId: true, theme: true, updatedAt: true } },
});
```

### Create a siteTheme

```typescript
const { mutate } = useCreateSiteThemeMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', databaseId: '<UUID>', isActive: '<Boolean>', name: '<String>', siteId: '<UUID>', storeId: '<UUID>', theme: '<JSON>' });
```
