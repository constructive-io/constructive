# platformApiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings

## Usage

```typescript
usePlatformApiSettingsQuery({ selection: { fields: { apiId: true, createdAt: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true, updatedAt: true } } })
usePlatformApiSettingQuery({ id: '<UUID>', selection: { fields: { apiId: true, createdAt: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true, updatedAt: true } } })
useCreatePlatformApiSettingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformApiSettingMutation({ selection: { fields: { id: true } } })
useDeletePlatformApiSettingMutation({})
```

## Examples

### List all platformApiSettings

```typescript
const { data, isLoading } = usePlatformApiSettingsQuery({
  selection: { fields: { apiId: true, createdAt: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true, updatedAt: true } },
});
```

### Create a platformApiSetting

```typescript
const { mutate } = useCreatePlatformApiSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', options: '<JSON>' });
```
