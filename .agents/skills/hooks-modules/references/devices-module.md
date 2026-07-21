# devicesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DevicesModule data operations

## Usage

```typescript
useDevicesModulesQuery({ selection: { fields: { databaseId: true, deviceSettingsTableId: true, deviceSettingsTableName: true, id: true, schemaId: true, userDevicesTableId: true, userDevicesTableName: true } } })
useDevicesModuleQuery({ id: '<UUID>', selection: { fields: { databaseId: true, deviceSettingsTableId: true, deviceSettingsTableName: true, id: true, schemaId: true, userDevicesTableId: true, userDevicesTableName: true } } })
useCreateDevicesModuleMutation({ selection: { fields: { id: true } } })
useUpdateDevicesModuleMutation({ selection: { fields: { id: true } } })
useDeleteDevicesModuleMutation({})
```

## Examples

### List all devicesModules

```typescript
const { data, isLoading } = useDevicesModulesQuery({
  selection: { fields: { databaseId: true, deviceSettingsTableId: true, deviceSettingsTableName: true, id: true, schemaId: true, userDevicesTableId: true, userDevicesTableName: true } },
});
```

### Create a devicesModule

```typescript
const { mutate } = useCreateDevicesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', deviceSettingsTableId: '<UUID>', deviceSettingsTableName: '<String>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', userDevicesTableName: '<String>' });
```
