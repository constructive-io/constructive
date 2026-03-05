# siteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Theme configuration for a site; stores design tokens, colors, and typography as JSONB

## Usage

```typescript
useSiteThemesQuery({ selection: { fields: { id: true, databaseId: true, siteId: true, theme: true } } })
useSiteThemeQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, siteId: true, theme: true } } })
useCreateSiteThemeMutation({ selection: { fields: { id: true } } })
useUpdateSiteThemeMutation({ selection: { fields: { id: true } } })
useDeleteSiteThemeMutation({})
```

## Examples

### List all siteThemes

```typescript
const { data, isLoading } = useSiteThemesQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, theme: true } },
});
```

### Create a siteTheme

```typescript
const { mutate } = useCreateSiteThemeMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', siteId: '<value>', theme: '<value>' });
```
