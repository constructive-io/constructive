# databaseSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Database-wide feature flags and settings; controls which platform features are available to all APIs in this database

## Usage

```typescript
useDatabaseSettingsQuery({ selection: { fields: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } } })
useDatabaseSettingQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } } })
useCreateDatabaseSettingMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseSettingMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseSettingMutation({})
```

## Examples

### List all databaseSettings

```typescript
const { data, isLoading } = useDatabaseSettingsQuery({
  selection: { fields: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } },
});
```

### Create a databaseSetting

```typescript
const { mutate } = useCreateDatabaseSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', enableI18N: '<Boolean>', options: '<JSON>' });
```
