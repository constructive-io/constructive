# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ProfilesModule data operations

## Usage

```typescript
useProfilesModulesQuery({ selection: { fields: { actorTableId: true, apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useProfilesModuleQuery({ id: '<UUID>', selection: { fields: { actorTableId: true, apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCreateProfilesModuleMutation({ selection: { fields: { id: true } } })
useUpdateProfilesModuleMutation({ selection: { fields: { id: true } } })
useDeleteProfilesModuleMutation({})
```

## Examples

### List all profilesModules

```typescript
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { actorTableId: true, apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});
```

### Create a profilesModule

```typescript
const { mutate } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', membershipsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```
