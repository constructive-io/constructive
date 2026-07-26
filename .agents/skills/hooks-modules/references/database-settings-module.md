# databaseSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DatabaseSettingsModule data operations

## Usage

```typescript
useDatabaseSettingsModulesQuery({ selection: { fields: { apiName: true, databaseId: true, databaseSettingsTableId: true, databaseSettingsTableName: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, pubkeySettingsTableId: true, pubkeySettingsTableName: true, publicSchemaName: true, rlsSettingsTableId: true, rlsSettingsTableName: true, schemaId: true, scope: true, webauthnSettingsTableId: true, webauthnSettingsTableName: true } } })
useDatabaseSettingsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, databaseSettingsTableId: true, databaseSettingsTableName: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, pubkeySettingsTableId: true, pubkeySettingsTableName: true, publicSchemaName: true, rlsSettingsTableId: true, rlsSettingsTableName: true, schemaId: true, scope: true, webauthnSettingsTableId: true, webauthnSettingsTableName: true } } })
useCreateDatabaseSettingsModuleMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseSettingsModuleMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseSettingsModuleMutation({})
```

## Examples

### List all databaseSettingsModules

```typescript
const { data, isLoading } = useDatabaseSettingsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, databaseSettingsTableId: true, databaseSettingsTableName: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, pubkeySettingsTableId: true, pubkeySettingsTableName: true, publicSchemaName: true, rlsSettingsTableId: true, rlsSettingsTableName: true, schemaId: true, scope: true, webauthnSettingsTableId: true, webauthnSettingsTableName: true } },
});
```

### Create a databaseSettingsModule

```typescript
const { mutate } = useCreateDatabaseSettingsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', databaseSettingsTableId: '<UUID>', databaseSettingsTableName: '<String>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', pubkeySettingsTableId: '<UUID>', pubkeySettingsTableName: '<String>', publicSchemaName: '<String>', rlsSettingsTableId: '<UUID>', rlsSettingsTableName: '<String>', schemaId: '<UUID>', scope: '<String>', webauthnSettingsTableId: '<UUID>', webauthnSettingsTableName: '<String>' });
```
