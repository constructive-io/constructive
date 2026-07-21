# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Mobile and native app configuration linked to a site, including store links and identifiers

## Usage

```typescript
useAppsQuery({ selection: { fields: { appIdPrefix: true, appImage: true, appStoreId: true, appStoreLink: true, databaseId: true, id: true, name: true, playStoreLink: true, siteId: true } } })
useAppQuery({ id: '<UUID>', selection: { fields: { appIdPrefix: true, appImage: true, appStoreId: true, appStoreLink: true, databaseId: true, id: true, name: true, playStoreLink: true, siteId: true } } })
useCreateAppMutation({ selection: { fields: { id: true } } })
useUpdateAppMutation({ selection: { fields: { id: true } } })
useDeleteAppMutation({})
```

## Examples

### List all apps

```typescript
const { data, isLoading } = useAppsQuery({
  selection: { fields: { appIdPrefix: true, appImage: true, appStoreId: true, appStoreLink: true, databaseId: true, id: true, name: true, playStoreLink: true, siteId: true } },
});
```

### Create a app

```typescript
const { mutate } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
mutate({ appIdPrefix: '<String>', appImage: '<Image>', appStoreId: '<String>', appStoreLink: '<Url>', databaseId: '<UUID>', name: '<String>', playStoreLink: '<Url>', siteId: '<UUID>' });
```
