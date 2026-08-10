# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ProfilesModule data operations

## Usage

```typescript
useProfilesModulesQuery({ selection: { fields: { actorTableId: true, apiName: true, capabilitiesTableId: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipProfilesTableId: true, membershipProfilesTableName: true, membershipsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileCapabilitiesTableId: true, profileCapabilitiesTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useProfilesModuleQuery({ id: '<UUID>', selection: { fields: { actorTableId: true, apiName: true, capabilitiesTableId: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipProfilesTableId: true, membershipProfilesTableName: true, membershipsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileCapabilitiesTableId: true, profileCapabilitiesTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCreateProfilesModuleMutation({ selection: { fields: { id: true } } })
useUpdateProfilesModuleMutation({ selection: { fields: { id: true } } })
useDeleteProfilesModuleMutation({})
```

## Examples

### List all profilesModules

```typescript
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { actorTableId: true, apiName: true, capabilitiesTableId: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipProfilesTableId: true, membershipProfilesTableName: true, membershipsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileCapabilitiesTableId: true, profileCapabilitiesTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});
```

### Create a profilesModule

```typescript
const { mutate } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorTableId: '<UUID>', apiName: '<String>', capabilitiesTableId: '<UUID>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', membershipProfilesTableId: '<UUID>', membershipProfilesTableName: '<String>', membershipsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', profileCapabilitiesTableId: '<UUID>', profileCapabilitiesTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```
