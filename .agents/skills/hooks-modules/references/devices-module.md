# devicesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DevicesModule data operations

## Usage

```typescript
useDevicesModulesQuery({ selection: { fields: { databaseId: true, deviceSettingsTable: true, deviceSettingsTableId: true, id: true, schemaId: true, userDevicesTable: true, userDevicesTableId: true } } })
useDevicesModuleQuery({ id: '<UUID>', selection: { fields: { databaseId: true, deviceSettingsTable: true, deviceSettingsTableId: true, id: true, schemaId: true, userDevicesTable: true, userDevicesTableId: true } } })
useCreateDevicesModuleMutation({ selection: { fields: { id: true } } })
useUpdateDevicesModuleMutation({ selection: { fields: { id: true } } })
useDeleteDevicesModuleMutation({})
```

## Examples

### List all devicesModules

```typescript
const { data, isLoading } = useDevicesModulesQuery({
  selection: { fields: { databaseId: true, deviceSettingsTable: true, deviceSettingsTableId: true, id: true, schemaId: true, userDevicesTable: true, userDevicesTableId: true } },
});
```

### Create a devicesModule

```typescript
const { mutate } = useCreateDevicesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', deviceSettingsTable: '<String>', deviceSettingsTableId: '<UUID>', schemaId: '<UUID>', userDevicesTable: '<String>', userDevicesTableId: '<UUID>' });
```
