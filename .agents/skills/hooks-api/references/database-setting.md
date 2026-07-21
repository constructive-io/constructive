# databaseSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Database-wide feature flags and settings; controls which platform features are available to all APIs in this database

## Usage

```typescript
useDatabaseSettingsQuery({ selection: { fields: { annotations: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, labels: true, options: true } } })
useDatabaseSettingQuery({ id: '<UUID>', selection: { fields: { annotations: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, labels: true, options: true } } })
useCreateDatabaseSettingMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseSettingMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseSettingMutation({})
```

## Examples

### List all databaseSettings

```typescript
const { data, isLoading } = useDatabaseSettingsQuery({
  selection: { fields: { annotations: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, labels: true, options: true } },
});
```

### Create a databaseSetting

```typescript
const { mutate } = useCreateDatabaseSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', labels: '<JSON>', options: '<JSON>' });
```
