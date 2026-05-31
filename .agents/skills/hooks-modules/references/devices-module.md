# devicesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DevicesModule data operations

## Usage

```typescript
useDevicesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, userDevicesTableId: true, deviceSettingsTableId: true, userDevicesTable: true, deviceSettingsTable: true } } })
useDevicesModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, userDevicesTableId: true, deviceSettingsTableId: true, userDevicesTable: true, deviceSettingsTable: true } } })
useCreateDevicesModuleMutation({ selection: { fields: { id: true } } })
useUpdateDevicesModuleMutation({ selection: { fields: { id: true } } })
useDeleteDevicesModuleMutation({})
```

## Examples

### List all devicesModules

```typescript
const { data, isLoading } = useDevicesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, userDevicesTableId: true, deviceSettingsTableId: true, userDevicesTable: true, deviceSettingsTable: true } },
});
```

### Create a devicesModule

```typescript
const { mutate } = useCreateDevicesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', deviceSettingsTableId: '<UUID>', userDevicesTable: '<String>', deviceSettingsTable: '<String>' });
```
