# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Mobile and native app configuration linked to a site, including store links and identifiers

## Usage

```typescript
useAppsQuery({ selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } } })
useAppQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } } })
useCreateAppMutation({ selection: { fields: { id: true } } })
useUpdateAppMutation({ selection: { fields: { id: true } } })
useDeleteAppMutation({})
```

## Examples

### List all apps

```typescript
const { data, isLoading } = useAppsQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } },
});
```

### Create a app

```typescript
const { mutate } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', siteId: '<UUID>', name: '<String>', appImage: '<Image>', appStoreLink: '<Url>', appStoreId: '<String>', appIdPrefix: '<String>', playStoreLink: '<Url>' });
```
