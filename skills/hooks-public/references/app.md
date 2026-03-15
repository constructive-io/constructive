# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Mobile and native app configuration linked to a site, including store links and identifiers

## Usage

```typescript
useAppsQuery({ selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true, nameTrgmSimilarity: true, appStoreIdTrgmSimilarity: true, appIdPrefixTrgmSimilarity: true, searchScore: true } } })
useAppQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true, nameTrgmSimilarity: true, appStoreIdTrgmSimilarity: true, appIdPrefixTrgmSimilarity: true, searchScore: true } } })
useCreateAppMutation({ selection: { fields: { id: true } } })
useUpdateAppMutation({ selection: { fields: { id: true } } })
useDeleteAppMutation({})
```

## Examples

### List all apps

```typescript
const { data, isLoading } = useAppsQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true, nameTrgmSimilarity: true, appStoreIdTrgmSimilarity: true, appIdPrefixTrgmSimilarity: true, searchScore: true } },
});
```

### Create a app

```typescript
const { mutate } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', siteId: '<value>', name: '<value>', appImage: '<value>', appStoreLink: '<value>', appStoreId: '<value>', appIdPrefix: '<value>', playStoreLink: '<value>', nameTrgmSimilarity: '<value>', appStoreIdTrgmSimilarity: '<value>', appIdPrefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```
