# notificationsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for NotificationsModule data operations

## Usage

```typescript
useNotificationsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, eventsTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true } } })
useNotificationsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, eventsTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true } } })
useCreateNotificationsModuleMutation({ selection: { fields: { id: true } } })
useUpdateNotificationsModuleMutation({ selection: { fields: { id: true } } })
useDeleteNotificationsModuleMutation({})
```

## Examples

### List all notificationsModules

```typescript
const { data, isLoading } = useNotificationsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, eventsTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true } },
});
```

### Create a notificationsModule

```typescript
const { mutate } = useCreateNotificationsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', notificationsTableId: '<UUID>', eventsTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>' });
```
