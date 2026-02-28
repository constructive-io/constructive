# hooks-app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for App data operations

## Usage

```typescript
useAppsQuery({ selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } } })
useAppQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } } })
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
mutate({ databaseId: '<value>', siteId: '<value>', name: '<value>', appImage: '<value>', appStoreLink: '<value>', appStoreId: '<value>', appIdPrefix: '<value>', playStoreLink: '<value>' });
```
