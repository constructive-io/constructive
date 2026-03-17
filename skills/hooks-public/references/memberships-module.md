# membershipsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MembershipsModule data operations

## Usage

```typescript
useMembershipsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, membershipsTableNameTrgmSimilarity: true, membersTableNameTrgmSimilarity: true, membershipDefaultsTableNameTrgmSimilarity: true, grantsTableNameTrgmSimilarity: true, adminGrantsTableNameTrgmSimilarity: true, ownerGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, actorMaskCheckTrgmSimilarity: true, actorPermCheckTrgmSimilarity: true, entityIdsByMaskTrgmSimilarity: true, entityIdsByPermTrgmSimilarity: true, entityIdsFunctionTrgmSimilarity: true, searchScore: true } } })
useMembershipsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, membershipsTableNameTrgmSimilarity: true, membersTableNameTrgmSimilarity: true, membershipDefaultsTableNameTrgmSimilarity: true, grantsTableNameTrgmSimilarity: true, adminGrantsTableNameTrgmSimilarity: true, ownerGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, actorMaskCheckTrgmSimilarity: true, actorPermCheckTrgmSimilarity: true, entityIdsByMaskTrgmSimilarity: true, entityIdsByPermTrgmSimilarity: true, entityIdsFunctionTrgmSimilarity: true, searchScore: true } } })
useCreateMembershipsModuleMutation({ selection: { fields: { id: true } } })
useUpdateMembershipsModuleMutation({ selection: { fields: { id: true } } })
useDeleteMembershipsModuleMutation({})
```

## Examples

### List all membershipsModules

```typescript
const { data, isLoading } = useMembershipsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, membershipsTableNameTrgmSimilarity: true, membersTableNameTrgmSimilarity: true, membershipDefaultsTableNameTrgmSimilarity: true, grantsTableNameTrgmSimilarity: true, adminGrantsTableNameTrgmSimilarity: true, ownerGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, actorMaskCheckTrgmSimilarity: true, actorPermCheckTrgmSimilarity: true, entityIdsByMaskTrgmSimilarity: true, entityIdsByPermTrgmSimilarity: true, entityIdsFunctionTrgmSimilarity: true, searchScore: true } },
});
```

### Create a membershipsModule

```typescript
const { mutate } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', membershipsTableId: '<value>', membershipsTableName: '<value>', membersTableId: '<value>', membersTableName: '<value>', membershipDefaultsTableId: '<value>', membershipDefaultsTableName: '<value>', grantsTableId: '<value>', grantsTableName: '<value>', actorTableId: '<value>', limitsTableId: '<value>', defaultLimitsTableId: '<value>', permissionsTableId: '<value>', defaultPermissionsTableId: '<value>', sprtTableId: '<value>', adminGrantsTableId: '<value>', adminGrantsTableName: '<value>', ownerGrantsTableId: '<value>', ownerGrantsTableName: '<value>', membershipType: '<value>', entityTableId: '<value>', entityTableOwnerId: '<value>', prefix: '<value>', actorMaskCheck: '<value>', actorPermCheck: '<value>', entityIdsByMask: '<value>', entityIdsByPerm: '<value>', entityIdsFunction: '<value>', membershipsTableNameTrgmSimilarity: '<value>', membersTableNameTrgmSimilarity: '<value>', membershipDefaultsTableNameTrgmSimilarity: '<value>', grantsTableNameTrgmSimilarity: '<value>', adminGrantsTableNameTrgmSimilarity: '<value>', ownerGrantsTableNameTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', actorMaskCheckTrgmSimilarity: '<value>', actorPermCheckTrgmSimilarity: '<value>', entityIdsByMaskTrgmSimilarity: '<value>', entityIdsByPermTrgmSimilarity: '<value>', entityIdsFunctionTrgmSimilarity: '<value>', searchScore: '<value>' });
```
