# siteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Theme (colors, fonts, design tokens) for a site surface

## Usage

```typescript
useSiteThemesQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, siteId: true, theme: true, updatedAt: true } } })
useSiteThemeQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, siteId: true, theme: true, updatedAt: true } } })
useCreateSiteThemeMutation({ selection: { fields: { id: true } } })
useUpdateSiteThemeMutation({ selection: { fields: { id: true } } })
useDeleteSiteThemeMutation({})
```

## Examples

### List all siteThemes

```typescript
const { data, isLoading } = useSiteThemesQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, siteId: true, theme: true, updatedAt: true } },
});
```

### Create a siteTheme

```typescript
const { mutate } = useCreateSiteThemeMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', siteId: '<UUID>', theme: '<JSON>' });
```
