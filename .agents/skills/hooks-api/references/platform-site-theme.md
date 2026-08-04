# platformSiteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Theme (colors, fonts, design tokens) for a site surface

## Usage

```typescript
usePlatformSiteThemesQuery({ selection: { fields: { commitId: true, createdAt: true, id: true, isActive: true, name: true, siteId: true, storeId: true, theme: true, updatedAt: true } } })
usePlatformSiteThemeQuery({ id: '<UUID>', selection: { fields: { commitId: true, createdAt: true, id: true, isActive: true, name: true, siteId: true, storeId: true, theme: true, updatedAt: true } } })
useCreatePlatformSiteThemeMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteThemeMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteThemeMutation({})
```

## Examples

### List all platformSiteThemes

```typescript
const { data, isLoading } = usePlatformSiteThemesQuery({
  selection: { fields: { commitId: true, createdAt: true, id: true, isActive: true, name: true, siteId: true, storeId: true, theme: true, updatedAt: true } },
});
```

### Create a platformSiteTheme

```typescript
const { mutate } = useCreatePlatformSiteThemeMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', isActive: '<Boolean>', name: '<String>', siteId: '<UUID>', storeId: '<UUID>', theme: '<JSON>' });
```
