# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ProfilesModule data operations

## Usage

```typescript
useProfilesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } } })
useProfilesModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } } })
useCreateProfilesModuleMutation({ selection: { fields: { id: true } } })
useUpdateProfilesModuleMutation({ selection: { fields: { id: true } } })
useDeleteProfilesModuleMutation({})
```

## Examples

### List all profilesModules

```typescript
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } },
});
```

### Create a profilesModule

```typescript
const { mutate } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', prefix: '<String>' });
```
