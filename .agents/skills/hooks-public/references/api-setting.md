# apiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default

## Usage

```typescript
useApiSettingsQuery({ selection: { fields: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, options: true } } })
useApiSettingQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, options: true } } })
useCreateApiSettingMutation({ selection: { fields: { id: true } } })
useUpdateApiSettingMutation({ selection: { fields: { id: true } } })
useDeleteApiSettingMutation({})
```

## Examples

### List all apiSettings

```typescript
const { data, isLoading } = useApiSettingsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, options: true } },
});
```

### Create a apiSetting

```typescript
const { mutate } = useCreateApiSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', apiId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', options: '<JSON>' });
```
