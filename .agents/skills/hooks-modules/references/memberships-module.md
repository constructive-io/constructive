# membershipsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MembershipsModule data operations

## Usage

```typescript
useMembershipsModulesQuery({ selection: { fields: { actorMaskCheck: true, actorPermCheck: true, actorTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, apiName: true, capabilitiesTableId: true, capabilityDefaultCapabilitiesTableId: true, capabilityDefaultGrantsTableId: true, databaseId: true, defaultCapabilitiesTableId: true, defaultLimitsTableId: true, entityField: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, grantsTableId: true, grantsTableName: true, id: true, limitsTableId: true, memberProfilesTableId: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, membershipsTableId: true, membershipsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, sprtTableId: true } } })
useMembershipsModuleQuery({ id: '<UUID>', selection: { fields: { actorMaskCheck: true, actorPermCheck: true, actorTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, apiName: true, capabilitiesTableId: true, capabilityDefaultCapabilitiesTableId: true, capabilityDefaultGrantsTableId: true, databaseId: true, defaultCapabilitiesTableId: true, defaultLimitsTableId: true, entityField: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, grantsTableId: true, grantsTableName: true, id: true, limitsTableId: true, memberProfilesTableId: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, membershipsTableId: true, membershipsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, sprtTableId: true } } })
useCreateMembershipsModuleMutation({ selection: { fields: { id: true } } })
useUpdateMembershipsModuleMutation({ selection: { fields: { id: true } } })
useDeleteMembershipsModuleMutation({})
```

## Examples

### List all membershipsModules

```typescript
const { data, isLoading } = useMembershipsModulesQuery({
  selection: { fields: { actorMaskCheck: true, actorPermCheck: true, actorTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, apiName: true, capabilitiesTableId: true, capabilityDefaultCapabilitiesTableId: true, capabilityDefaultGrantsTableId: true, databaseId: true, defaultCapabilitiesTableId: true, defaultLimitsTableId: true, entityField: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, grantsTableId: true, grantsTableName: true, id: true, limitsTableId: true, memberProfilesTableId: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, membershipsTableId: true, membershipsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, sprtTableId: true } },
});
```

### Create a membershipsModule

```typescript
const { mutate } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorMaskCheck: '<String>', actorPermCheck: '<String>', actorTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', apiName: '<String>', capabilitiesTableId: '<UUID>', capabilityDefaultCapabilitiesTableId: '<UUID>', capabilityDefaultGrantsTableId: '<UUID>', databaseId: '<UUID>', defaultCapabilitiesTableId: '<UUID>', defaultLimitsTableId: '<UUID>', entityField: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', getOrgFn: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', limitsTableId: '<UUID>', memberProfilesTableId: '<UUID>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableId: '<UUID>' });
```
