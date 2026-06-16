# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ProfilesModule data operations

## Usage

```typescript
useProfilesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, apiName: true, privateApiName: true } } })
useProfilesModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, apiName: true, privateApiName: true } } })
useCreateProfilesModuleMutation({ selection: { fields: { id: true } } })
useUpdateProfilesModuleMutation({ selection: { fields: { id: true } } })
useDeleteProfilesModuleMutation({})
```

## Examples

### List all profilesModules

```typescript
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, apiName: true, privateApiName: true } },
});
```

### Create a profilesModule

```typescript
const { mutate } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```
