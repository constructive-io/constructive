# entityTypeProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions a new membership entity type. Each INSERT creates an entity table, registers a membership type,
     and installs the required modules (permissions, memberships, limits) plus optional modules (profiles, levels, invites).
     Uses provision_membership_table() internally. Graceful: duplicate (database_id, prefix) pairs are silently skipped
     via the unique constraint (use INSERT ... ON CONFLICT DO NOTHING).
     Policy behavior: by default the five entity-table RLS policies are applied (gated by is_visible).
     Set table_provision to a single jsonb object (using the same shape as provision_table() /
     blueprint tables[] entries) to replace the defaults with your own; set skip_entity_policies=true
     as an escape hatch to apply zero policies.

## Usage

```typescript
useEntityTypeProvisionsQuery({ selection: { fields: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasInvites: true, hasInviteAchievements: true, storage: true, namespaces: true, functions: true, graphs: true, agents: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outNamespaceEventsTableId: true, outFunctionModuleId: true, outDefinitionsTableId: true, outInvocationsTableId: true, outExecutionLogsTableId: true, outGraphModuleId: true, outGraphsTableId: true, outAgentModuleId: true } } })
useEntityTypeProvisionQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasInvites: true, hasInviteAchievements: true, storage: true, namespaces: true, functions: true, graphs: true, agents: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outNamespaceEventsTableId: true, outFunctionModuleId: true, outDefinitionsTableId: true, outInvocationsTableId: true, outExecutionLogsTableId: true, outGraphModuleId: true, outGraphsTableId: true, outAgentModuleId: true } } })
useCreateEntityTypeProvisionMutation({ selection: { fields: { id: true } } })
useUpdateEntityTypeProvisionMutation({ selection: { fields: { id: true } } })
useDeleteEntityTypeProvisionMutation({})
```

## Examples

### List all entityTypeProvisions

```typescript
const { data, isLoading } = useEntityTypeProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasInvites: true, hasInviteAchievements: true, storage: true, namespaces: true, functions: true, graphs: true, agents: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outNamespaceEventsTableId: true, outFunctionModuleId: true, outDefinitionsTableId: true, outInvocationsTableId: true, outExecutionLogsTableId: true, outGraphModuleId: true, outGraphsTableId: true, outAgentModuleId: true } },
});
```

### Create a entityTypeProvision

```typescript
const { mutate } = useCreateEntityTypeProvisionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', name: '<String>', prefix: '<String>', description: '<String>', parentEntity: '<String>', tableName: '<String>', isVisible: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', hasLevels: '<Boolean>', hasInvites: '<Boolean>', hasInviteAchievements: '<Boolean>', storage: '<JSON>', namespaces: '<JSON>', functions: '<JSON>', graphs: '<JSON>', agents: '<JSON>', skipEntityPolicies: '<Boolean>', tableProvision: '<JSON>', outMembershipType: '<Int>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outInstalledModules: '<String>', outStorageModuleId: '<UUID>', outBucketsTableId: '<UUID>', outFilesTableId: '<UUID>', outPathSharesTableId: '<UUID>', outInvitesModuleId: '<UUID>', outNamespaceModuleId: '<UUID>', outNamespacesTableId: '<UUID>', outNamespaceEventsTableId: '<UUID>', outFunctionModuleId: '<UUID>', outDefinitionsTableId: '<UUID>', outInvocationsTableId: '<UUID>', outExecutionLogsTableId: '<UUID>', outGraphModuleId: '<UUID>', outGraphsTableId: '<UUID>', outAgentModuleId: '<UUID>' });
```
