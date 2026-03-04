---
name: hooks-public-profiles-module
description: React Query hooks for ProfilesModule data operations
---

# hooks-public-profiles-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ProfilesModule data operations

## Usage

```typescript
useProfilesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } } })
useProfilesModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } } })
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
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', profilePermissionsTableId: '<value>', profilePermissionsTableName: '<value>', profileGrantsTableId: '<value>', profileGrantsTableName: '<value>', profileDefinitionGrantsTableId: '<value>', profileDefinitionGrantsTableName: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', permissionsTableId: '<value>', membershipsTableId: '<value>', prefix: '<value>' });
```
