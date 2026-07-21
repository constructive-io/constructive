# apiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default

## Usage

```typescript
useApiSettingsQuery({ selection: { fields: { apiId: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true } } })
useApiSettingQuery({ id: '<UUID>', selection: { fields: { apiId: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true } } })
useCreateApiSettingMutation({ selection: { fields: { id: true } } })
useUpdateApiSettingMutation({ selection: { fields: { id: true } } })
useDeleteApiSettingMutation({})
```

## Examples

### List all apiSettings

```typescript
const { data, isLoading } = useApiSettingsQuery({
  selection: { fields: { apiId: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true } },
});
```

### Create a apiSetting

```typescript
const { mutate } = useCreateApiSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', options: '<JSON>' });
```
