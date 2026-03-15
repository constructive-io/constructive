# React Query Hooks

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from './hooks';

configure({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useOrgGetManagersQuery` | Query | List all orgGetManagers |
| `useCreateOrgGetManagersRecordMutation` | Mutation | Create a orgGetManagersRecord |
| `useOrgGetSubordinatesQuery` | Query | List all orgGetSubordinates |
| `useCreateOrgGetSubordinatesRecordMutation` | Mutation | Create a orgGetSubordinatesRecord |
| `useGetAllQuery` | Query | List all getAll |
| `useCreateGetAllRecordMutation` | Mutation | Create a getAllRecord |
| `useAppPermissionsQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useAppPermissionQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useCreateAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useUpdateAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useDeleteAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useOrgPermissionsQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useOrgPermissionQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useCreateOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useUpdateOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useDeleteOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useObjectsQuery` | Query | List all objects |
| `useObjectQuery` | Query | Get one object |
| `useCreateObjectMutation` | Mutation | Create a object |
| `useUpdateObjectMutation` | Mutation | Update a object |
| `useDeleteObjectMutation` | Mutation | Delete a object |
| `useAppLevelRequirementsQuery` | Query | Defines the specific requirements that must be met to achieve a level |
| `useAppLevelRequirementQuery` | Query | Defines the specific requirements that must be met to achieve a level |
| `useCreateAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useUpdateAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useDeleteAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useDatabasesQuery` | Query | List all databases |
| `useDatabaseQuery` | Query | Get one database |
| `useCreateDatabaseMutation` | Mutation | Create a database |
| `useUpdateDatabaseMutation` | Mutation | Update a database |
| `useDeleteDatabaseMutation` | Mutation | Delete a database |
| `useSchemasQuery` | Query | List all schemas |
| `useSchemaQuery` | Query | Get one schema |
| `useCreateSchemaMutation` | Mutation | Create a schema |
| `useUpdateSchemaMutation` | Mutation | Update a schema |
| `useDeleteSchemaMutation` | Mutation | Delete a schema |
| `useTablesQuery` | Query | List all tables |
| `useTableQuery` | Query | Get one table |
| `useCreateTableMutation` | Mutation | Create a table |
| `useUpdateTableMutation` | Mutation | Update a table |
| `useDeleteTableMutation` | Mutation | Delete a table |
| `useCheckConstraintsQuery` | Query | List all checkConstraints |
| `useCheckConstraintQuery` | Query | Get one checkConstraint |
| `useCreateCheckConstraintMutation` | Mutation | Create a checkConstraint |
| `useUpdateCheckConstraintMutation` | Mutation | Update a checkConstraint |
| `useDeleteCheckConstraintMutation` | Mutation | Delete a checkConstraint |
| `useFieldsQuery` | Query | List all fields |
| `useFieldQuery` | Query | Get one field |
| `useCreateFieldMutation` | Mutation | Create a field |
| `useUpdateFieldMutation` | Mutation | Update a field |
| `useDeleteFieldMutation` | Mutation | Delete a field |
| `useForeignKeyConstraintsQuery` | Query | List all foreignKeyConstraints |
| `useForeignKeyConstraintQuery` | Query | Get one foreignKeyConstraint |
| `useCreateForeignKeyConstraintMutation` | Mutation | Create a foreignKeyConstraint |
| `useUpdateForeignKeyConstraintMutation` | Mutation | Update a foreignKeyConstraint |
| `useDeleteForeignKeyConstraintMutation` | Mutation | Delete a foreignKeyConstraint |
| `useFullTextSearchesQuery` | Query | List all fullTextSearches |
| `useFullTextSearchQuery` | Query | Get one fullTextSearch |
| `useCreateFullTextSearchMutation` | Mutation | Create a fullTextSearch |
| `useUpdateFullTextSearchMutation` | Mutation | Update a fullTextSearch |
| `useDeleteFullTextSearchMutation` | Mutation | Delete a fullTextSearch |
| `useIndicesQuery` | Query | List all indices |
| `useIndexQuery` | Query | Get one index |
| `useCreateIndexMutation` | Mutation | Create a index |
| `useUpdateIndexMutation` | Mutation | Update a index |
| `useDeleteIndexMutation` | Mutation | Delete a index |
| `usePoliciesQuery` | Query | List all policies |
| `usePolicyQuery` | Query | Get one policy |
| `useCreatePolicyMutation` | Mutation | Create a policy |
| `useUpdatePolicyMutation` | Mutation | Update a policy |
| `useDeletePolicyMutation` | Mutation | Delete a policy |
| `usePrimaryKeyConstraintsQuery` | Query | List all primaryKeyConstraints |
| `usePrimaryKeyConstraintQuery` | Query | Get one primaryKeyConstraint |
| `useCreatePrimaryKeyConstraintMutation` | Mutation | Create a primaryKeyConstraint |
| `useUpdatePrimaryKeyConstraintMutation` | Mutation | Update a primaryKeyConstraint |
| `useDeletePrimaryKeyConstraintMutation` | Mutation | Delete a primaryKeyConstraint |
| `useTableGrantsQuery` | Query | List all tableGrants |
| `useTableGrantQuery` | Query | Get one tableGrant |
| `useCreateTableGrantMutation` | Mutation | Create a tableGrant |
| `useUpdateTableGrantMutation` | Mutation | Update a tableGrant |
| `useDeleteTableGrantMutation` | Mutation | Delete a tableGrant |
| `useTriggersQuery` | Query | List all triggers |
| `useTriggerQuery` | Query | Get one trigger |
| `useCreateTriggerMutation` | Mutation | Create a trigger |
| `useUpdateTriggerMutation` | Mutation | Update a trigger |
| `useDeleteTriggerMutation` | Mutation | Delete a trigger |
| `useUniqueConstraintsQuery` | Query | List all uniqueConstraints |
| `useUniqueConstraintQuery` | Query | Get one uniqueConstraint |
| `useCreateUniqueConstraintMutation` | Mutation | Create a uniqueConstraint |
| `useUpdateUniqueConstraintMutation` | Mutation | Update a uniqueConstraint |
| `useDeleteUniqueConstraintMutation` | Mutation | Delete a uniqueConstraint |
| `useViewsQuery` | Query | List all views |
| `useViewQuery` | Query | Get one view |
| `useCreateViewMutation` | Mutation | Create a view |
| `useUpdateViewMutation` | Mutation | Update a view |
| `useDeleteViewMutation` | Mutation | Delete a view |
| `useViewTablesQuery` | Query | Junction table linking views to their joined tables for referential integrity |
| `useViewTableQuery` | Query | Junction table linking views to their joined tables for referential integrity |
| `useCreateViewTableMutation` | Mutation | Junction table linking views to their joined tables for referential integrity |
| `useUpdateViewTableMutation` | Mutation | Junction table linking views to their joined tables for referential integrity |
| `useDeleteViewTableMutation` | Mutation | Junction table linking views to their joined tables for referential integrity |
| `useViewGrantsQuery` | Query | List all viewGrants |
| `useViewGrantQuery` | Query | Get one viewGrant |
| `useCreateViewGrantMutation` | Mutation | Create a viewGrant |
| `useUpdateViewGrantMutation` | Mutation | Update a viewGrant |
| `useDeleteViewGrantMutation` | Mutation | Delete a viewGrant |
| `useViewRulesQuery` | Query | DO INSTEAD rules for views (e.g., read-only enforcement) |
| `useViewRuleQuery` | Query | DO INSTEAD rules for views (e.g., read-only enforcement) |
| `useCreateViewRuleMutation` | Mutation | DO INSTEAD rules for views (e.g., read-only enforcement) |
| `useUpdateViewRuleMutation` | Mutation | DO INSTEAD rules for views (e.g., read-only enforcement) |
| `useDeleteViewRuleMutation` | Mutation | DO INSTEAD rules for views (e.g., read-only enforcement) |
| `useTableTemplateModulesQuery` | Query | List all tableTemplateModules |
| `useTableTemplateModuleQuery` | Query | Get one tableTemplateModule |
| `useCreateTableTemplateModuleMutation` | Mutation | Create a tableTemplateModule |
| `useUpdateTableTemplateModuleMutation` | Mutation | Update a tableTemplateModule |
| `useDeleteTableTemplateModuleMutation` | Mutation | Delete a tableTemplateModule |
| `useSecureTableProvisionsQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useSecureTableProvisionQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useCreateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useUpdateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useDeleteSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useRelationProvisionsQuery` | Query | Provisions relational structure between tables. Supports four relation types:
     - RelationBelongsTo: adds a FK field on the source table referencing the target table (child perspective: "tasks belongs to projects" -> tasks.project_id).
     - RelationHasMany: adds a FK field on the target table referencing the source table (parent perspective: "projects has many tasks" -> tasks.project_id). Inverse of BelongsTo.
     - RelationHasOne: adds a FK field with a unique constraint on the source table referencing the target table. Also supports shared-primary-key patterns where the FK field IS the primary key (set field_name to the existing PK field name).
     - RelationManyToMany: creates a junction table with FK fields to both source and target tables, delegating table creation and security to secure_table_provision.
     This is a one-and-done structural provisioner. To layer additional security onto junction tables after creation, use secure_table_provision directly.
     All operations are graceful: existing fields, FK constraints, and unique constraints are reused if found.
     The trigger never injects values the caller did not provide. All security config is forwarded to secure_table_provision as-is. |
| `useRelationProvisionQuery` | Query | Provisions relational structure between tables. Supports four relation types:
     - RelationBelongsTo: adds a FK field on the source table referencing the target table (child perspective: "tasks belongs to projects" -> tasks.project_id).
     - RelationHasMany: adds a FK field on the target table referencing the source table (parent perspective: "projects has many tasks" -> tasks.project_id). Inverse of BelongsTo.
     - RelationHasOne: adds a FK field with a unique constraint on the source table referencing the target table. Also supports shared-primary-key patterns where the FK field IS the primary key (set field_name to the existing PK field name).
     - RelationManyToMany: creates a junction table with FK fields to both source and target tables, delegating table creation and security to secure_table_provision.
     This is a one-and-done structural provisioner. To layer additional security onto junction tables after creation, use secure_table_provision directly.
     All operations are graceful: existing fields, FK constraints, and unique constraints are reused if found.
     The trigger never injects values the caller did not provide. All security config is forwarded to secure_table_provision as-is. |
| `useCreateRelationProvisionMutation` | Mutation | Provisions relational structure between tables. Supports four relation types:
     - RelationBelongsTo: adds a FK field on the source table referencing the target table (child perspective: "tasks belongs to projects" -> tasks.project_id).
     - RelationHasMany: adds a FK field on the target table referencing the source table (parent perspective: "projects has many tasks" -> tasks.project_id). Inverse of BelongsTo.
     - RelationHasOne: adds a FK field with a unique constraint on the source table referencing the target table. Also supports shared-primary-key patterns where the FK field IS the primary key (set field_name to the existing PK field name).
     - RelationManyToMany: creates a junction table with FK fields to both source and target tables, delegating table creation and security to secure_table_provision.
     This is a one-and-done structural provisioner. To layer additional security onto junction tables after creation, use secure_table_provision directly.
     All operations are graceful: existing fields, FK constraints, and unique constraints are reused if found.
     The trigger never injects values the caller did not provide. All security config is forwarded to secure_table_provision as-is. |
| `useUpdateRelationProvisionMutation` | Mutation | Provisions relational structure between tables. Supports four relation types:
     - RelationBelongsTo: adds a FK field on the source table referencing the target table (child perspective: "tasks belongs to projects" -> tasks.project_id).
     - RelationHasMany: adds a FK field on the target table referencing the source table (parent perspective: "projects has many tasks" -> tasks.project_id). Inverse of BelongsTo.
     - RelationHasOne: adds a FK field with a unique constraint on the source table referencing the target table. Also supports shared-primary-key patterns where the FK field IS the primary key (set field_name to the existing PK field name).
     - RelationManyToMany: creates a junction table with FK fields to both source and target tables, delegating table creation and security to secure_table_provision.
     This is a one-and-done structural provisioner. To layer additional security onto junction tables after creation, use secure_table_provision directly.
     All operations are graceful: existing fields, FK constraints, and unique constraints are reused if found.
     The trigger never injects values the caller did not provide. All security config is forwarded to secure_table_provision as-is. |
| `useDeleteRelationProvisionMutation` | Mutation | Provisions relational structure between tables. Supports four relation types:
     - RelationBelongsTo: adds a FK field on the source table referencing the target table (child perspective: "tasks belongs to projects" -> tasks.project_id).
     - RelationHasMany: adds a FK field on the target table referencing the source table (parent perspective: "projects has many tasks" -> tasks.project_id). Inverse of BelongsTo.
     - RelationHasOne: adds a FK field with a unique constraint on the source table referencing the target table. Also supports shared-primary-key patterns where the FK field IS the primary key (set field_name to the existing PK field name).
     - RelationManyToMany: creates a junction table with FK fields to both source and target tables, delegating table creation and security to secure_table_provision.
     This is a one-and-done structural provisioner. To layer additional security onto junction tables after creation, use secure_table_provision directly.
     All operations are graceful: existing fields, FK constraints, and unique constraints are reused if found.
     The trigger never injects values the caller did not provide. All security config is forwarded to secure_table_provision as-is. |
| `useSchemaGrantsQuery` | Query | List all schemaGrants |
| `useSchemaGrantQuery` | Query | Get one schemaGrant |
| `useCreateSchemaGrantMutation` | Mutation | Create a schemaGrant |
| `useUpdateSchemaGrantMutation` | Mutation | Update a schemaGrant |
| `useDeleteSchemaGrantMutation` | Mutation | Delete a schemaGrant |
| `useDefaultPrivilegesQuery` | Query | List all defaultPrivileges |
| `useDefaultPrivilegeQuery` | Query | Get one defaultPrivilege |
| `useCreateDefaultPrivilegeMutation` | Mutation | Create a defaultPrivilege |
| `useUpdateDefaultPrivilegeMutation` | Mutation | Update a defaultPrivilege |
| `useDeleteDefaultPrivilegeMutation` | Mutation | Delete a defaultPrivilege |
| `useApiSchemasQuery` | Query | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useApiSchemaQuery` | Query | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useCreateApiSchemaMutation` | Mutation | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useUpdateApiSchemaMutation` | Mutation | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useDeleteApiSchemaMutation` | Mutation | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useApiModulesQuery` | Query | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useApiModuleQuery` | Query | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useCreateApiModuleMutation` | Mutation | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useUpdateApiModuleMutation` | Mutation | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useDeleteApiModuleMutation` | Mutation | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useDomainsQuery` | Query | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useDomainQuery` | Query | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useCreateDomainMutation` | Mutation | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useUpdateDomainMutation` | Mutation | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useDeleteDomainMutation` | Mutation | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useSiteMetadataQuery` | Query | SEO and social sharing metadata for a site: page title, description, and Open Graph image |
| `useSiteMetadatumQuery` | Query | SEO and social sharing metadata for a site: page title, description, and Open Graph image |
| `useCreateSiteMetadatumMutation` | Mutation | SEO and social sharing metadata for a site: page title, description, and Open Graph image |
| `useUpdateSiteMetadatumMutation` | Mutation | SEO and social sharing metadata for a site: page title, description, and Open Graph image |
| `useDeleteSiteMetadatumMutation` | Mutation | SEO and social sharing metadata for a site: page title, description, and Open Graph image |
| `useSiteModulesQuery` | Query | Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site |
| `useSiteModuleQuery` | Query | Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site |
| `useCreateSiteModuleMutation` | Mutation | Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site |
| `useUpdateSiteModuleMutation` | Mutation | Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site |
| `useDeleteSiteModuleMutation` | Mutation | Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site |
| `useSiteThemesQuery` | Query | Theme configuration for a site; stores design tokens, colors, and typography as JSONB |
| `useSiteThemeQuery` | Query | Theme configuration for a site; stores design tokens, colors, and typography as JSONB |
| `useCreateSiteThemeMutation` | Mutation | Theme configuration for a site; stores design tokens, colors, and typography as JSONB |
| `useUpdateSiteThemeMutation` | Mutation | Theme configuration for a site; stores design tokens, colors, and typography as JSONB |
| `useDeleteSiteThemeMutation` | Mutation | Theme configuration for a site; stores design tokens, colors, and typography as JSONB |
| `useTriggerFunctionsQuery` | Query | List all triggerFunctions |
| `useTriggerFunctionQuery` | Query | Get one triggerFunction |
| `useCreateTriggerFunctionMutation` | Mutation | Create a triggerFunction |
| `useUpdateTriggerFunctionMutation` | Mutation | Update a triggerFunction |
| `useDeleteTriggerFunctionMutation` | Mutation | Delete a triggerFunction |
| `useApisQuery` | Query | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useApiQuery` | Query | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useCreateApiMutation` | Mutation | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useUpdateApiMutation` | Mutation | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useDeleteApiMutation` | Mutation | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useSitesQuery` | Query | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useSiteQuery` | Query | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useCreateSiteMutation` | Mutation | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useUpdateSiteMutation` | Mutation | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useDeleteSiteMutation` | Mutation | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useAppsQuery` | Query | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useAppQuery` | Query | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useCreateAppMutation` | Mutation | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useUpdateAppMutation` | Mutation | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useDeleteAppMutation` | Mutation | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useConnectedAccountsModulesQuery` | Query | List all connectedAccountsModules |
| `useConnectedAccountsModuleQuery` | Query | Get one connectedAccountsModule |
| `useCreateConnectedAccountsModuleMutation` | Mutation | Create a connectedAccountsModule |
| `useUpdateConnectedAccountsModuleMutation` | Mutation | Update a connectedAccountsModule |
| `useDeleteConnectedAccountsModuleMutation` | Mutation | Delete a connectedAccountsModule |
| `useCryptoAddressesModulesQuery` | Query | List all cryptoAddressesModules |
| `useCryptoAddressesModuleQuery` | Query | Get one cryptoAddressesModule |
| `useCreateCryptoAddressesModuleMutation` | Mutation | Create a cryptoAddressesModule |
| `useUpdateCryptoAddressesModuleMutation` | Mutation | Update a cryptoAddressesModule |
| `useDeleteCryptoAddressesModuleMutation` | Mutation | Delete a cryptoAddressesModule |
| `useCryptoAuthModulesQuery` | Query | List all cryptoAuthModules |
| `useCryptoAuthModuleQuery` | Query | Get one cryptoAuthModule |
| `useCreateCryptoAuthModuleMutation` | Mutation | Create a cryptoAuthModule |
| `useUpdateCryptoAuthModuleMutation` | Mutation | Update a cryptoAuthModule |
| `useDeleteCryptoAuthModuleMutation` | Mutation | Delete a cryptoAuthModule |
| `useDefaultIdsModulesQuery` | Query | List all defaultIdsModules |
| `useDefaultIdsModuleQuery` | Query | Get one defaultIdsModule |
| `useCreateDefaultIdsModuleMutation` | Mutation | Create a defaultIdsModule |
| `useUpdateDefaultIdsModuleMutation` | Mutation | Update a defaultIdsModule |
| `useDeleteDefaultIdsModuleMutation` | Mutation | Delete a defaultIdsModule |
| `useDenormalizedTableFieldsQuery` | Query | List all denormalizedTableFields |
| `useDenormalizedTableFieldQuery` | Query | Get one denormalizedTableField |
| `useCreateDenormalizedTableFieldMutation` | Mutation | Create a denormalizedTableField |
| `useUpdateDenormalizedTableFieldMutation` | Mutation | Update a denormalizedTableField |
| `useDeleteDenormalizedTableFieldMutation` | Mutation | Delete a denormalizedTableField |
| `useEmailsModulesQuery` | Query | List all emailsModules |
| `useEmailsModuleQuery` | Query | Get one emailsModule |
| `useCreateEmailsModuleMutation` | Mutation | Create a emailsModule |
| `useUpdateEmailsModuleMutation` | Mutation | Update a emailsModule |
| `useDeleteEmailsModuleMutation` | Mutation | Delete a emailsModule |
| `useEncryptedSecretsModulesQuery` | Query | List all encryptedSecretsModules |
| `useEncryptedSecretsModuleQuery` | Query | Get one encryptedSecretsModule |
| `useCreateEncryptedSecretsModuleMutation` | Mutation | Create a encryptedSecretsModule |
| `useUpdateEncryptedSecretsModuleMutation` | Mutation | Update a encryptedSecretsModule |
| `useDeleteEncryptedSecretsModuleMutation` | Mutation | Delete a encryptedSecretsModule |
| `useFieldModulesQuery` | Query | List all fieldModules |
| `useFieldModuleQuery` | Query | Get one fieldModule |
| `useCreateFieldModuleMutation` | Mutation | Create a fieldModule |
| `useUpdateFieldModuleMutation` | Mutation | Update a fieldModule |
| `useDeleteFieldModuleMutation` | Mutation | Delete a fieldModule |
| `useInvitesModulesQuery` | Query | List all invitesModules |
| `useInvitesModuleQuery` | Query | Get one invitesModule |
| `useCreateInvitesModuleMutation` | Mutation | Create a invitesModule |
| `useUpdateInvitesModuleMutation` | Mutation | Update a invitesModule |
| `useDeleteInvitesModuleMutation` | Mutation | Delete a invitesModule |
| `useLevelsModulesQuery` | Query | List all levelsModules |
| `useLevelsModuleQuery` | Query | Get one levelsModule |
| `useCreateLevelsModuleMutation` | Mutation | Create a levelsModule |
| `useUpdateLevelsModuleMutation` | Mutation | Update a levelsModule |
| `useDeleteLevelsModuleMutation` | Mutation | Delete a levelsModule |
| `useLimitsModulesQuery` | Query | List all limitsModules |
| `useLimitsModuleQuery` | Query | Get one limitsModule |
| `useCreateLimitsModuleMutation` | Mutation | Create a limitsModule |
| `useUpdateLimitsModuleMutation` | Mutation | Update a limitsModule |
| `useDeleteLimitsModuleMutation` | Mutation | Delete a limitsModule |
| `useMembershipTypesModulesQuery` | Query | List all membershipTypesModules |
| `useMembershipTypesModuleQuery` | Query | Get one membershipTypesModule |
| `useCreateMembershipTypesModuleMutation` | Mutation | Create a membershipTypesModule |
| `useUpdateMembershipTypesModuleMutation` | Mutation | Update a membershipTypesModule |
| `useDeleteMembershipTypesModuleMutation` | Mutation | Delete a membershipTypesModule |
| `useMembershipsModulesQuery` | Query | List all membershipsModules |
| `useMembershipsModuleQuery` | Query | Get one membershipsModule |
| `useCreateMembershipsModuleMutation` | Mutation | Create a membershipsModule |
| `useUpdateMembershipsModuleMutation` | Mutation | Update a membershipsModule |
| `useDeleteMembershipsModuleMutation` | Mutation | Delete a membershipsModule |
| `usePermissionsModulesQuery` | Query | List all permissionsModules |
| `usePermissionsModuleQuery` | Query | Get one permissionsModule |
| `useCreatePermissionsModuleMutation` | Mutation | Create a permissionsModule |
| `useUpdatePermissionsModuleMutation` | Mutation | Update a permissionsModule |
| `useDeletePermissionsModuleMutation` | Mutation | Delete a permissionsModule |
| `usePhoneNumbersModulesQuery` | Query | List all phoneNumbersModules |
| `usePhoneNumbersModuleQuery` | Query | Get one phoneNumbersModule |
| `useCreatePhoneNumbersModuleMutation` | Mutation | Create a phoneNumbersModule |
| `useUpdatePhoneNumbersModuleMutation` | Mutation | Update a phoneNumbersModule |
| `useDeletePhoneNumbersModuleMutation` | Mutation | Delete a phoneNumbersModule |
| `useProfilesModulesQuery` | Query | List all profilesModules |
| `useProfilesModuleQuery` | Query | Get one profilesModule |
| `useCreateProfilesModuleMutation` | Mutation | Create a profilesModule |
| `useUpdateProfilesModuleMutation` | Mutation | Update a profilesModule |
| `useDeleteProfilesModuleMutation` | Mutation | Delete a profilesModule |
| `useSecretsModulesQuery` | Query | List all secretsModules |
| `useSecretsModuleQuery` | Query | Get one secretsModule |
| `useCreateSecretsModuleMutation` | Mutation | Create a secretsModule |
| `useUpdateSecretsModuleMutation` | Mutation | Update a secretsModule |
| `useDeleteSecretsModuleMutation` | Mutation | Delete a secretsModule |
| `useSessionsModulesQuery` | Query | List all sessionsModules |
| `useSessionsModuleQuery` | Query | Get one sessionsModule |
| `useCreateSessionsModuleMutation` | Mutation | Create a sessionsModule |
| `useUpdateSessionsModuleMutation` | Mutation | Update a sessionsModule |
| `useDeleteSessionsModuleMutation` | Mutation | Delete a sessionsModule |
| `useUserAuthModulesQuery` | Query | List all userAuthModules |
| `useUserAuthModuleQuery` | Query | Get one userAuthModule |
| `useCreateUserAuthModuleMutation` | Mutation | Create a userAuthModule |
| `useUpdateUserAuthModuleMutation` | Mutation | Update a userAuthModule |
| `useDeleteUserAuthModuleMutation` | Mutation | Delete a userAuthModule |
| `useUsersModulesQuery` | Query | List all usersModules |
| `useUsersModuleQuery` | Query | Get one usersModule |
| `useCreateUsersModuleMutation` | Mutation | Create a usersModule |
| `useUpdateUsersModuleMutation` | Mutation | Update a usersModule |
| `useDeleteUsersModuleMutation` | Mutation | Delete a usersModule |
| `useUuidModulesQuery` | Query | List all uuidModules |
| `useUuidModuleQuery` | Query | Get one uuidModule |
| `useCreateUuidModuleMutation` | Mutation | Create a uuidModule |
| `useUpdateUuidModuleMutation` | Mutation | Update a uuidModule |
| `useDeleteUuidModuleMutation` | Mutation | Delete a uuidModule |
| `useDatabaseProvisionModulesQuery` | Query | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useDatabaseProvisionModuleQuery` | Query | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useCreateDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useUpdateDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useDeleteDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useAppAdminGrantsQuery` | Query | Records of admin role grants and revocations between members |
| `useAppAdminGrantQuery` | Query | Records of admin role grants and revocations between members |
| `useCreateAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useUpdateAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useDeleteAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useAppOwnerGrantsQuery` | Query | Records of ownership transfers and grants between members |
| `useAppOwnerGrantQuery` | Query | Records of ownership transfers and grants between members |
| `useCreateAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useUpdateAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useDeleteAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useAppGrantsQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useAppGrantQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useCreateAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useUpdateAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useDeleteAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useOrgMembershipsQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useOrgMembershipQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useCreateOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useUpdateOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useDeleteOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useOrgMembersQuery` | Query | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useOrgMemberQuery` | Query | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useCreateOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useUpdateOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useDeleteOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useOrgAdminGrantsQuery` | Query | Records of admin role grants and revocations between members |
| `useOrgAdminGrantQuery` | Query | Records of admin role grants and revocations between members |
| `useCreateOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useUpdateOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useDeleteOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useOrgOwnerGrantsQuery` | Query | Records of ownership transfers and grants between members |
| `useOrgOwnerGrantQuery` | Query | Records of ownership transfers and grants between members |
| `useCreateOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useUpdateOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useDeleteOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useOrgGrantsQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useOrgGrantQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useCreateOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useUpdateOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useDeleteOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useOrgChartEdgesQuery` | Query | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useOrgChartEdgeQuery` | Query | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useCreateOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useUpdateOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useDeleteOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useOrgChartEdgeGrantsQuery` | Query | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useOrgChartEdgeGrantQuery` | Query | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useCreateOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useUpdateOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useDeleteOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useAppLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useAppLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useAppStepsQuery` | Query | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useAppStepQuery` | Query | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useCreateAppStepMutation` | Mutation | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useUpdateAppStepMutation` | Mutation | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useDeleteAppStepMutation` | Mutation | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useAppAchievementsQuery` | Query | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useAppAchievementQuery` | Query | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useCreateAppAchievementMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useUpdateAppAchievementMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useDeleteAppAchievementMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useInvitesQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useInviteQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useCreateInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useUpdateInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useDeleteInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useClaimedInvitesQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useClaimedInviteQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useCreateClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useUpdateClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useDeleteClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useOrgInvitesQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useOrgInviteQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useCreateOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useUpdateOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useDeleteOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useOrgClaimedInvitesQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useOrgClaimedInviteQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useCreateOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useUpdateOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useDeleteOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useRefsQuery` | Query | A ref is a data structure for pointing to a commit. |
| `useRefQuery` | Query | A ref is a data structure for pointing to a commit. |
| `useCreateRefMutation` | Mutation | A ref is a data structure for pointing to a commit. |
| `useUpdateRefMutation` | Mutation | A ref is a data structure for pointing to a commit. |
| `useDeleteRefMutation` | Mutation | A ref is a data structure for pointing to a commit. |
| `useStoresQuery` | Query | A store represents an isolated object repository within a database. |
| `useStoreQuery` | Query | A store represents an isolated object repository within a database. |
| `useCreateStoreMutation` | Mutation | A store represents an isolated object repository within a database. |
| `useUpdateStoreMutation` | Mutation | A store represents an isolated object repository within a database. |
| `useDeleteStoreMutation` | Mutation | A store represents an isolated object repository within a database. |
| `useAppPermissionDefaultsQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useAppPermissionDefaultQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useCreateAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useUpdateAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useDeleteAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useCryptoAddressesQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCryptoAddressQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCreateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useUpdateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useDeleteCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useRoleTypesQuery` | Query | List all roleTypes |
| `useRoleTypeQuery` | Query | Get one roleType |
| `useCreateRoleTypeMutation` | Mutation | Create a roleType |
| `useUpdateRoleTypeMutation` | Mutation | Update a roleType |
| `useDeleteRoleTypeMutation` | Mutation | Delete a roleType |
| `useOrgPermissionDefaultsQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useOrgPermissionDefaultQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useCreateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useUpdateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useDeleteOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `usePhoneNumbersQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `usePhoneNumberQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `useCreatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useUpdatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useDeletePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useAppLimitDefaultsQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useAppLimitDefaultQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useCreateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useUpdateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useDeleteAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useOrgLimitDefaultsQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useOrgLimitDefaultQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useCreateOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useUpdateOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useDeleteOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useConnectedAccountsQuery` | Query | OAuth and social login connections linking external service accounts to users |
| `useConnectedAccountQuery` | Query | OAuth and social login connections linking external service accounts to users |
| `useCreateConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useUpdateConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useDeleteConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useNodeTypeRegistriesQuery` | Query | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useNodeTypeRegistryQuery` | Query | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useCreateNodeTypeRegistryMutation` | Mutation | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useUpdateNodeTypeRegistryMutation` | Mutation | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useDeleteNodeTypeRegistryMutation` | Mutation | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useMembershipTypesQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useMembershipTypeQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useCreateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useUpdateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useDeleteMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useAppMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useAppMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useRlsModulesQuery` | Query | List all rlsModules |
| `useRlsModuleQuery` | Query | Get one rlsModule |
| `useCreateRlsModuleMutation` | Mutation | Create a rlsModule |
| `useUpdateRlsModuleMutation` | Mutation | Update a rlsModule |
| `useDeleteRlsModuleMutation` | Mutation | Delete a rlsModule |
| `useCommitsQuery` | Query | A commit records changes to the repository. |
| `useCommitQuery` | Query | A commit records changes to the repository. |
| `useCreateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useUpdateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useDeleteCommitMutation` | Mutation | A commit records changes to the repository. |
| `useOrgMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useAuditLogsQuery` | Query | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useAuditLogQuery` | Query | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useCreateAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useUpdateAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useDeleteAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useAppLevelsQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useAppLevelQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useCreateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useUpdateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useDeleteAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useSqlMigrationsQuery` | Query | List all sqlMigrations |
| `useSqlMigrationQuery` | Query | Get one sqlMigration |
| `useCreateSqlMigrationMutation` | Mutation | Create a sqlMigration |
| `useUpdateSqlMigrationMutation` | Mutation | Update a sqlMigration |
| `useDeleteSqlMigrationMutation` | Mutation | Delete a sqlMigration |
| `useEmailsQuery` | Query | User email addresses with verification and primary-email management |
| `useEmailQuery` | Query | User email addresses with verification and primary-email management |
| `useCreateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useUpdateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useDeleteEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useAstMigrationsQuery` | Query | List all astMigrations |
| `useAstMigrationQuery` | Query | Get one astMigration |
| `useCreateAstMigrationMutation` | Mutation | Create a astMigration |
| `useUpdateAstMigrationMutation` | Mutation | Update a astMigration |
| `useDeleteAstMigrationMutation` | Mutation | Delete a astMigration |
| `useAppMembershipsQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useAppMembershipQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useCreateAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useUpdateAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useDeleteAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useUsersQuery` | Query | List all users |
| `useUserQuery` | Query | Get one user |
| `useCreateUserMutation` | Mutation | Create a user |
| `useUpdateUserMutation` | Mutation | Update a user |
| `useDeleteUserMutation` | Mutation | Delete a user |
| `useHierarchyModulesQuery` | Query | List all hierarchyModules |
| `useHierarchyModuleQuery` | Query | Get one hierarchyModule |
| `useCreateHierarchyModuleMutation` | Mutation | Create a hierarchyModule |
| `useUpdateHierarchyModuleMutation` | Mutation | Update a hierarchyModule |
| `useDeleteHierarchyModuleMutation` | Mutation | Delete a hierarchyModule |
| `useCurrentUserIdQuery` | Query | currentUserId |
| `useCurrentIpAddressQuery` | Query | currentIpAddress |
| `useCurrentUserAgentQuery` | Query | currentUserAgent |
| `useAppPermissionsGetPaddedMaskQuery` | Query | appPermissionsGetPaddedMask |
| `useOrgPermissionsGetPaddedMaskQuery` | Query | orgPermissionsGetPaddedMask |
| `useStepsAchievedQuery` | Query | stepsAchieved |
| `useRevParseQuery` | Query | revParse |
| `useOrgIsManagerOfQuery` | Query | orgIsManagerOf |
| `useAppPermissionsGetMaskQuery` | Query | appPermissionsGetMask |
| `useOrgPermissionsGetMaskQuery` | Query | orgPermissionsGetMask |
| `useAppPermissionsGetMaskByNamesQuery` | Query | appPermissionsGetMaskByNames |
| `useOrgPermissionsGetMaskByNamesQuery` | Query | orgPermissionsGetMaskByNames |
| `useAppPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `AppPermission`. |
| `useOrgPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `OrgPermission`. |
| `useGetAllObjectsFromRootQuery` | Query | Reads and enables pagination through a set of `Object`. |
| `useGetPathObjectsFromRootQuery` | Query | Reads and enables pagination through a set of `Object`. |
| `useGetObjectAtPathQuery` | Query | getObjectAtPath |
| `useStepsRequiredQuery` | Query | Reads and enables pagination through a set of `AppLevelRequirement`. |
| `useCurrentUserQuery` | Query | currentUser |
| `useSignOutMutation` | Mutation | signOut |
| `useSendAccountDeletionEmailMutation` | Mutation | sendAccountDeletionEmail |
| `useCheckPasswordMutation` | Mutation | checkPassword |
| `useSubmitInviteCodeMutation` | Mutation | submitInviteCode |
| `useSubmitOrgInviteCodeMutation` | Mutation | submitOrgInviteCode |
| `useFreezeObjectsMutation` | Mutation | freezeObjects |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useConfirmDeleteAccountMutation` | Mutation | confirmDeleteAccount |
| `useSetPasswordMutation` | Mutation | setPassword |
| `useVerifyEmailMutation` | Mutation | verifyEmail |
| `useResetPasswordMutation` | Mutation | resetPassword |
| `useBootstrapUserMutation` | Mutation | bootstrapUser |
| `useRemoveNodeAtPathMutation` | Mutation | removeNodeAtPath |
| `useSetDataAtPathMutation` | Mutation | setDataAtPath |
| `useSetPropsAndCommitMutation` | Mutation | setPropsAndCommit |
| `useProvisionDatabaseWithUserMutation` | Mutation | provisionDatabaseWithUser |
| `useSignInOneTimeTokenMutation` | Mutation | signInOneTimeToken |
| `useCreateUserDatabaseMutation` | Mutation | Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include levels/achievements (default: false)
  - bitlen: Bit length for permission masks (default: 64)
  - tokens_expiration: Token expiration interval (default: 30 days)

Returns the database_id UUID of the newly created database.

Example usage:
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, true, true);  -- with invites and groups
 |
| `useExtendTokenExpiresMutation` | Mutation | extendTokenExpires |
| `useSignInMutation` | Mutation | signIn |
| `useSignUpMutation` | Mutation | signUp |
| `useSetFieldOrderMutation` | Mutation | setFieldOrder |
| `useOneTimeTokenMutation` | Mutation | oneTimeToken |
| `useInsertNodeAtPathMutation` | Mutation | insertNodeAtPath |
| `useUpdateNodeAtPathMutation` | Mutation | updateNodeAtPath |
| `useSetAndCommitMutation` | Mutation | setAndCommit |
| `useApplyRlsMutation` | Mutation | applyRls |
| `useForgotPasswordMutation` | Mutation | forgotPassword |
| `useSendVerificationEmailMutation` | Mutation | sendVerificationEmail |
| `useVerifyPasswordMutation` | Mutation | verifyPassword |
| `useVerifyTotpMutation` | Mutation | verifyTotp |

## Table Hooks

### OrgGetManagersRecord

```typescript
// List all orgGetManagers
const { data, isLoading } = useOrgGetManagersQuery({
  selection: { fields: { userId: true, depth: true } },
});

// Create a orgGetManagersRecord
const { mutate: create } = useCreateOrgGetManagersRecordMutation({
  selection: { fields: { id: true } },
});
create({ userId: '<value>', depth: '<value>' });
```

### OrgGetSubordinatesRecord

```typescript
// List all orgGetSubordinates
const { data, isLoading } = useOrgGetSubordinatesQuery({
  selection: { fields: { userId: true, depth: true } },
});

// Create a orgGetSubordinatesRecord
const { mutate: create } = useCreateOrgGetSubordinatesRecordMutation({
  selection: { fields: { id: true } },
});
create({ userId: '<value>', depth: '<value>' });
```

### GetAllRecord

```typescript
// List all getAll
const { data, isLoading } = useGetAllQuery({
  selection: { fields: { path: true, data: true } },
});

// Create a getAllRecord
const { mutate: create } = useCreateGetAllRecordMutation({
  selection: { fields: { id: true } },
});
create({ path: '<value>', data: '<value>' });
```

### AppPermission

```typescript
// List all appPermissions
const { data, isLoading } = useAppPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Get one appPermission
const { data: item } = useAppPermissionQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Create a appPermission
const { mutate: create } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### OrgPermission

```typescript
// List all orgPermissions
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Get one orgPermission
const { data: item } = useOrgPermissionQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Create a orgPermission
const { mutate: create } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Object

```typescript
// List all objects
const { data, isLoading } = useObjectsQuery({
  selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Get one object
const { data: item } = useObjectQuery({
  id: '<value>',
  selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Create a object
const { mutate: create } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
create({ hashUuid: '<value>', databaseId: '<value>', kids: '<value>', ktree: '<value>', data: '<value>', frzn: '<value>' });
```

### AppLevelRequirement

```typescript
// List all appLevelRequirements
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Get one appLevelRequirement
const { data: item } = useAppLevelRequirementQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Create a appLevelRequirement
const { mutate: create } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', level: '<value>', description: '<value>', requiredCount: '<value>', priority: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Database

```typescript
// List all databases
const { data, isLoading } = useDatabasesQuery({
  selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true, schemaHashTrgmSimilarity: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, searchScore: true } },
});

// Get one database
const { data: item } = useDatabaseQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true, schemaHashTrgmSimilarity: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, searchScore: true } },
});

// Create a database
const { mutate: create } = useCreateDatabaseMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', schemaHash: '<value>', name: '<value>', label: '<value>', hash: '<value>', schemaHashTrgmSimilarity: '<value>', nameTrgmSimilarity: '<value>', labelTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Schema

```typescript
// List all schemas
const { data, isLoading } = useSchemasQuery({
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, schemaNameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one schema
const { data: item } = useSchemaQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, schemaNameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a schema
const { mutate: create } = useCreateSchemaMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', schemaName: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', isPublic: '<value>', nameTrgmSimilarity: '<value>', schemaNameTrgmSimilarity: '<value>', labelTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Table

```typescript
// List all tables
const { data, isLoading } = useTablesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, pluralNameTrgmSimilarity: true, singularNameTrgmSimilarity: true, searchScore: true } },
});

// Get one table
const { data: item } = useTableQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, pluralNameTrgmSimilarity: true, singularNameTrgmSimilarity: true, searchScore: true } },
});

// Create a table
const { mutate: create } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', useRls: '<value>', timestamps: '<value>', peoplestamps: '<value>', pluralName: '<value>', singularName: '<value>', tags: '<value>', inheritsId: '<value>', nameTrgmSimilarity: '<value>', labelTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', pluralNameTrgmSimilarity: '<value>', singularNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### CheckConstraint

```typescript
// List all checkConstraints
const { data, isLoading } = useCheckConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one checkConstraint
const { data: item } = useCheckConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a checkConstraint
const { mutate: create } = useCreateCheckConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', expr: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', typeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Field

```typescript
// List all fields
const { data, isLoading } = useFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, defaultValueTrgmSimilarity: true, regexpTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one field
const { data: item } = useFieldQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, defaultValueTrgmSimilarity: true, regexpTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a field
const { mutate: create } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', isRequired: '<value>', defaultValue: '<value>', defaultValueAst: '<value>', isHidden: '<value>', type: '<value>', fieldOrder: '<value>', regexp: '<value>', chk: '<value>', chkExpr: '<value>', min: '<value>', max: '<value>', tags: '<value>', category: '<value>', module: '<value>', scope: '<value>', nameTrgmSimilarity: '<value>', labelTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', defaultValueTrgmSimilarity: '<value>', regexpTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ForeignKeyConstraint

```typescript
// List all foreignKeyConstraints
const { data, isLoading } = useForeignKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, descriptionTrgmSimilarity: true, typeTrgmSimilarity: true, deleteActionTrgmSimilarity: true, updateActionTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one foreignKeyConstraint
const { data: item } = useForeignKeyConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, descriptionTrgmSimilarity: true, typeTrgmSimilarity: true, deleteActionTrgmSimilarity: true, updateActionTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a foreignKeyConstraint
const { mutate: create } = useCreateForeignKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', refTableId: '<value>', refFieldIds: '<value>', deleteAction: '<value>', updateAction: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', typeTrgmSimilarity: '<value>', deleteActionTrgmSimilarity: '<value>', updateActionTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### FullTextSearch

```typescript
// List all fullTextSearches
const { data, isLoading } = useFullTextSearchesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } },
});

// Get one fullTextSearch
const { data: item } = useFullTextSearchQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } },
});

// Create a fullTextSearch
const { mutate: create } = useCreateFullTextSearchMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', fieldId: '<value>', fieldIds: '<value>', weights: '<value>', langs: '<value>' });
```

### Index

```typescript
// List all indices
const { data, isLoading } = useIndicesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, options: true, opClasses: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, accessMethodTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one index
const { data: item } = useIndexQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, options: true, opClasses: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, accessMethodTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a index
const { mutate: create } = useCreateIndexMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', fieldIds: '<value>', includeFieldIds: '<value>', accessMethod: '<value>', indexParams: '<value>', whereClause: '<value>', isUnique: '<value>', options: '<value>', opClasses: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', accessMethodTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Policy

```typescript
// List all policies
const { data, isLoading } = usePoliciesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, granteeNameTrgmSimilarity: true, privilegeTrgmSimilarity: true, policyTypeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one policy
const { data: item } = usePolicyQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, granteeNameTrgmSimilarity: true, privilegeTrgmSimilarity: true, policyTypeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a policy
const { mutate: create } = useCreatePolicyMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', granteeName: '<value>', privilege: '<value>', permissive: '<value>', disabled: '<value>', policyType: '<value>', data: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', granteeNameTrgmSimilarity: '<value>', privilegeTrgmSimilarity: '<value>', policyTypeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### PrimaryKeyConstraint

```typescript
// List all primaryKeyConstraints
const { data, isLoading } = usePrimaryKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one primaryKeyConstraint
const { data: item } = usePrimaryKeyConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a primaryKeyConstraint
const { mutate: create } = useCreatePrimaryKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', typeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### TableGrant

```typescript
// List all tableGrants
const { data, isLoading } = useTableGrantsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});

// Get one tableGrant
const { data: item } = useTableGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});

// Create a tableGrant
const { mutate: create } = useCreateTableGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', privilege: '<value>', granteeName: '<value>', fieldIds: '<value>', isGrant: '<value>', privilegeTrgmSimilarity: '<value>', granteeNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Trigger

```typescript
// List all triggers
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, eventTrgmSimilarity: true, functionNameTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one trigger
const { data: item } = useTriggerQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, eventTrgmSimilarity: true, functionNameTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a trigger
const { mutate: create } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', event: '<value>', functionName: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', eventTrgmSimilarity: '<value>', functionNameTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### UniqueConstraint

```typescript
// List all uniqueConstraints
const { data, isLoading } = useUniqueConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, descriptionTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one uniqueConstraint
const { data: item } = useUniqueConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, descriptionTrgmSimilarity: true, typeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a uniqueConstraint
const { mutate: create } = useCreateUniqueConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', typeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### View

```typescript
// List all views
const { data, isLoading } = useViewsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true, nameTrgmSimilarity: true, viewTypeTrgmSimilarity: true, filterTypeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Get one view
const { data: item } = useViewQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true, nameTrgmSimilarity: true, viewTypeTrgmSimilarity: true, filterTypeTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});

// Create a view
const { mutate: create } = useCreateViewMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', name: '<value>', tableId: '<value>', viewType: '<value>', data: '<value>', filterType: '<value>', filterData: '<value>', securityInvoker: '<value>', isReadOnly: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', viewTypeTrgmSimilarity: '<value>', filterTypeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ViewTable

```typescript
// List all viewTables
const { data, isLoading } = useViewTablesQuery({
  selection: { fields: { id: true, viewId: true, tableId: true, joinOrder: true } },
});

// Get one viewTable
const { data: item } = useViewTableQuery({
  id: '<value>',
  selection: { fields: { id: true, viewId: true, tableId: true, joinOrder: true } },
});

// Create a viewTable
const { mutate: create } = useCreateViewTableMutation({
  selection: { fields: { id: true } },
});
create({ viewId: '<value>', tableId: '<value>', joinOrder: '<value>' });
```

### ViewGrant

```typescript
// List all viewGrants
const { data, isLoading } = useViewGrantsQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true, granteeNameTrgmSimilarity: true, privilegeTrgmSimilarity: true, searchScore: true } },
});

// Get one viewGrant
const { data: item } = useViewGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true, granteeNameTrgmSimilarity: true, privilegeTrgmSimilarity: true, searchScore: true } },
});

// Create a viewGrant
const { mutate: create } = useCreateViewGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', viewId: '<value>', granteeName: '<value>', privilege: '<value>', withGrantOption: '<value>', isGrant: '<value>', granteeNameTrgmSimilarity: '<value>', privilegeTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ViewRule

```typescript
// List all viewRules
const { data, isLoading } = useViewRulesQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true, nameTrgmSimilarity: true, eventTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } },
});

// Get one viewRule
const { data: item } = useViewRuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true, nameTrgmSimilarity: true, eventTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } },
});

// Create a viewRule
const { mutate: create } = useCreateViewRuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', viewId: '<value>', name: '<value>', event: '<value>', action: '<value>', nameTrgmSimilarity: '<value>', eventTrgmSimilarity: '<value>', actionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### TableTemplateModule

```typescript
// List all tableTemplateModules
const { data, isLoading } = useTableTemplateModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true, tableNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, searchScore: true } },
});

// Get one tableTemplateModule
const { data: item } = useTableTemplateModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true, tableNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, searchScore: true } },
});

// Create a tableTemplateModule
const { mutate: create } = useCreateTableTemplateModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', nodeType: '<value>', data: '<value>', tableNameTrgmSimilarity: '<value>', nodeTypeTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### SecureTableProvision

```typescript
// List all secureTableProvisions
const { data, isLoading } = useSecureTableProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, fields: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true, tableNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, policyTypeTrgmSimilarity: true, policyRoleTrgmSimilarity: true, policyNameTrgmSimilarity: true, searchScore: true } },
});

// Get one secureTableProvision
const { data: item } = useSecureTableProvisionQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, fields: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true, tableNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, policyTypeTrgmSimilarity: true, policyRoleTrgmSimilarity: true, policyNameTrgmSimilarity: true, searchScore: true } },
});

// Create a secureTableProvision
const { mutate: create } = useCreateSecureTableProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', nodeType: '<value>', useRls: '<value>', nodeData: '<value>', fields: '<value>', grantRoles: '<value>', grantPrivileges: '<value>', policyType: '<value>', policyPrivileges: '<value>', policyRole: '<value>', policyPermissive: '<value>', policyName: '<value>', policyData: '<value>', outFields: '<value>', tableNameTrgmSimilarity: '<value>', nodeTypeTrgmSimilarity: '<value>', policyTypeTrgmSimilarity: '<value>', policyRoleTrgmSimilarity: '<value>', policyNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### RelationProvision

```typescript
// List all relationProvisions
const { data, isLoading } = useRelationProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, nodeType: true, nodeData: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, relationTypeTrgmSimilarity: true, fieldNameTrgmSimilarity: true, deleteActionTrgmSimilarity: true, junctionTableNameTrgmSimilarity: true, sourceFieldNameTrgmSimilarity: true, targetFieldNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, policyTypeTrgmSimilarity: true, policyRoleTrgmSimilarity: true, policyNameTrgmSimilarity: true, searchScore: true } },
});

// Get one relationProvision
const { data: item } = useRelationProvisionQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, nodeType: true, nodeData: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, relationTypeTrgmSimilarity: true, fieldNameTrgmSimilarity: true, deleteActionTrgmSimilarity: true, junctionTableNameTrgmSimilarity: true, sourceFieldNameTrgmSimilarity: true, targetFieldNameTrgmSimilarity: true, nodeTypeTrgmSimilarity: true, policyTypeTrgmSimilarity: true, policyRoleTrgmSimilarity: true, policyNameTrgmSimilarity: true, searchScore: true } },
});

// Create a relationProvision
const { mutate: create } = useCreateRelationProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', relationType: '<value>', sourceTableId: '<value>', targetTableId: '<value>', fieldName: '<value>', deleteAction: '<value>', isRequired: '<value>', junctionTableId: '<value>', junctionTableName: '<value>', junctionSchemaId: '<value>', sourceFieldName: '<value>', targetFieldName: '<value>', useCompositeKey: '<value>', nodeType: '<value>', nodeData: '<value>', grantRoles: '<value>', grantPrivileges: '<value>', policyType: '<value>', policyPrivileges: '<value>', policyRole: '<value>', policyPermissive: '<value>', policyName: '<value>', policyData: '<value>', outFieldId: '<value>', outJunctionTableId: '<value>', outSourceFieldId: '<value>', outTargetFieldId: '<value>', relationTypeTrgmSimilarity: '<value>', fieldNameTrgmSimilarity: '<value>', deleteActionTrgmSimilarity: '<value>', junctionTableNameTrgmSimilarity: '<value>', sourceFieldNameTrgmSimilarity: '<value>', targetFieldNameTrgmSimilarity: '<value>', nodeTypeTrgmSimilarity: '<value>', policyTypeTrgmSimilarity: '<value>', policyRoleTrgmSimilarity: '<value>', policyNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### SchemaGrant

```typescript
// List all schemaGrants
const { data, isLoading } = useSchemaGrantsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});

// Get one schemaGrant
const { data: item } = useSchemaGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});

// Create a schemaGrant
const { mutate: create } = useCreateSchemaGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', granteeName: '<value>', granteeNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### DefaultPrivilege

```typescript
// List all defaultPrivileges
const { data, isLoading } = useDefaultPrivilegesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true, objectTypeTrgmSimilarity: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});

// Get one defaultPrivilege
const { data: item } = useDefaultPrivilegeQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true, objectTypeTrgmSimilarity: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});

// Create a defaultPrivilege
const { mutate: create } = useCreateDefaultPrivilegeMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', objectType: '<value>', privilege: '<value>', granteeName: '<value>', isGrant: '<value>', objectTypeTrgmSimilarity: '<value>', privilegeTrgmSimilarity: '<value>', granteeNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ApiSchema

```typescript
// List all apiSchemas
const { data, isLoading } = useApiSchemasQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, apiId: true } },
});

// Get one apiSchema
const { data: item } = useApiSchemaQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, apiId: true } },
});

// Create a apiSchema
const { mutate: create } = useCreateApiSchemaMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', apiId: '<value>' });
```

### ApiModule

```typescript
// List all apiModules
const { data, isLoading } = useApiModulesQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Get one apiModule
const { data: item } = useApiModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Create a apiModule
const { mutate: create } = useCreateApiModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', apiId: '<value>', name: '<value>', data: '<value>', nameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Domain

```typescript
// List all domains
const { data, isLoading } = useDomainsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } },
});

// Get one domain
const { data: item } = useDomainQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } },
});

// Create a domain
const { mutate: create } = useCreateDomainMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', apiId: '<value>', siteId: '<value>', subdomain: '<value>', domain: '<value>' });
```

### SiteMetadatum

```typescript
// List all siteMetadata
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Get one siteMetadatum
const { data: item } = useSiteMetadatumQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Create a siteMetadatum
const { mutate: create } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', siteId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>', titleTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### SiteModule

```typescript
// List all siteModules
const { data, isLoading } = useSiteModulesQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Get one siteModule
const { data: item } = useSiteModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Create a siteModule
const { mutate: create } = useCreateSiteModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', siteId: '<value>', name: '<value>', data: '<value>', nameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### SiteTheme

```typescript
// List all siteThemes
const { data, isLoading } = useSiteThemesQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, theme: true } },
});

// Get one siteTheme
const { data: item } = useSiteThemeQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, siteId: true, theme: true } },
});

// Create a siteTheme
const { mutate: create } = useCreateSiteThemeMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', siteId: '<value>', theme: '<value>' });
```

### TriggerFunction

```typescript
// List all triggerFunctions
const { data, isLoading } = useTriggerFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, codeTrgmSimilarity: true, searchScore: true } },
});

// Get one triggerFunction
const { data: item } = useTriggerFunctionQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, codeTrgmSimilarity: true, searchScore: true } },
});

// Create a triggerFunction
const { mutate: create } = useCreateTriggerFunctionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', code: '<value>', nameTrgmSimilarity: '<value>', codeTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Api

```typescript
// List all apis
const { data, isLoading } = useApisQuery({
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true, nameTrgmSimilarity: true, dbnameTrgmSimilarity: true, roleNameTrgmSimilarity: true, anonRoleTrgmSimilarity: true, searchScore: true } },
});

// Get one api
const { data: item } = useApiQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true, nameTrgmSimilarity: true, dbnameTrgmSimilarity: true, roleNameTrgmSimilarity: true, anonRoleTrgmSimilarity: true, searchScore: true } },
});

// Create a api
const { mutate: create } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', dbname: '<value>', roleName: '<value>', anonRole: '<value>', isPublic: '<value>', nameTrgmSimilarity: '<value>', dbnameTrgmSimilarity: '<value>', roleNameTrgmSimilarity: '<value>', anonRoleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Site

```typescript
// List all sites
const { data, isLoading } = useSitesQuery({
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, dbnameTrgmSimilarity: true, searchScore: true } },
});

// Get one site
const { data: item } = useSiteQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, dbnameTrgmSimilarity: true, searchScore: true } },
});

// Create a site
const { mutate: create } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>', favicon: '<value>', appleTouchIcon: '<value>', logo: '<value>', dbname: '<value>', titleTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', dbnameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### App

```typescript
// List all apps
const { data, isLoading } = useAppsQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true, nameTrgmSimilarity: true, appStoreIdTrgmSimilarity: true, appIdPrefixTrgmSimilarity: true, searchScore: true } },
});

// Get one app
const { data: item } = useAppQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true, nameTrgmSimilarity: true, appStoreIdTrgmSimilarity: true, appIdPrefixTrgmSimilarity: true, searchScore: true } },
});

// Create a app
const { mutate: create } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', siteId: '<value>', name: '<value>', appImage: '<value>', appStoreLink: '<value>', appStoreId: '<value>', appIdPrefix: '<value>', playStoreLink: '<value>', nameTrgmSimilarity: '<value>', appStoreIdTrgmSimilarity: '<value>', appIdPrefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ConnectedAccountsModule

```typescript
// List all connectedAccountsModules
const { data, isLoading } = useConnectedAccountsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Get one connectedAccountsModule
const { data: item } = useConnectedAccountsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Create a connectedAccountsModule
const { mutate: create } = useCreateConnectedAccountsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### CryptoAddressesModule

```typescript
// List all cryptoAddressesModules
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, tableNameTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, searchScore: true } },
});

// Get one cryptoAddressesModule
const { data: item } = useCryptoAddressesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, tableNameTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, searchScore: true } },
});

// Create a cryptoAddressesModule
const { mutate: create } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', cryptoNetwork: '<value>', tableNameTrgmSimilarity: '<value>', cryptoNetworkTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### CryptoAuthModule

```typescript
// List all cryptoAuthModules
const { data, isLoading } = useCryptoAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true, userFieldTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, signInRequestChallengeTrgmSimilarity: true, signInRecordFailureTrgmSimilarity: true, signUpWithKeyTrgmSimilarity: true, signInWithChallengeTrgmSimilarity: true, searchScore: true } },
});

// Get one cryptoAuthModule
const { data: item } = useCryptoAuthModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true, userFieldTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, signInRequestChallengeTrgmSimilarity: true, signInRecordFailureTrgmSimilarity: true, signUpWithKeyTrgmSimilarity: true, signInWithChallengeTrgmSimilarity: true, searchScore: true } },
});

// Create a cryptoAuthModule
const { mutate: create } = useCreateCryptoAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', addressesTableId: '<value>', userField: '<value>', cryptoNetwork: '<value>', signInRequestChallenge: '<value>', signInRecordFailure: '<value>', signUpWithKey: '<value>', signInWithChallenge: '<value>', userFieldTrgmSimilarity: '<value>', cryptoNetworkTrgmSimilarity: '<value>', signInRequestChallengeTrgmSimilarity: '<value>', signInRecordFailureTrgmSimilarity: '<value>', signUpWithKeyTrgmSimilarity: '<value>', signInWithChallengeTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### DefaultIdsModule

```typescript
// List all defaultIdsModules
const { data, isLoading } = useDefaultIdsModulesQuery({
  selection: { fields: { id: true, databaseId: true } },
});

// Get one defaultIdsModule
const { data: item } = useDefaultIdsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true } },
});

// Create a defaultIdsModule
const { mutate: create } = useCreateDefaultIdsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>' });
```

### DenormalizedTableField

```typescript
// List all denormalizedTableFields
const { data, isLoading } = useDenormalizedTableFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true, funcNameTrgmSimilarity: true, searchScore: true } },
});

// Get one denormalizedTableField
const { data: item } = useDenormalizedTableFieldQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true, funcNameTrgmSimilarity: true, searchScore: true } },
});

// Create a denormalizedTableField
const { mutate: create } = useCreateDenormalizedTableFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', fieldId: '<value>', setIds: '<value>', refTableId: '<value>', refFieldId: '<value>', refIds: '<value>', useUpdates: '<value>', updateDefaults: '<value>', funcName: '<value>', funcOrder: '<value>', funcNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### EmailsModule

```typescript
// List all emailsModules
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Get one emailsModule
const { data: item } = useEmailsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Create a emailsModule
const { mutate: create } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### EncryptedSecretsModule

```typescript
// List all encryptedSecretsModules
const { data, isLoading } = useEncryptedSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Get one encryptedSecretsModule
const { data: item } = useEncryptedSecretsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Create a encryptedSecretsModule
const { mutate: create } = useCreateEncryptedSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### FieldModule

```typescript
// List all fieldModules
const { data, isLoading } = useFieldModulesQuery({
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true, nodeTypeTrgmSimilarity: true, searchScore: true } },
});

// Get one fieldModule
const { data: item } = useFieldModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true, nodeTypeTrgmSimilarity: true, searchScore: true } },
});

// Create a fieldModule
const { mutate: create } = useCreateFieldModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', fieldId: '<value>', nodeType: '<value>', data: '<value>', triggers: '<value>', functions: '<value>', nodeTypeTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### InvitesModule

```typescript
// List all invitesModules
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true, invitesTableNameTrgmSimilarity: true, claimedInvitesTableNameTrgmSimilarity: true, submitInviteCodeFunctionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Get one invitesModule
const { data: item } = useInvitesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true, invitesTableNameTrgmSimilarity: true, claimedInvitesTableNameTrgmSimilarity: true, submitInviteCodeFunctionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Create a invitesModule
const { mutate: create } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', invitesTableId: '<value>', claimedInvitesTableId: '<value>', invitesTableName: '<value>', claimedInvitesTableName: '<value>', submitInviteCodeFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', invitesTableNameTrgmSimilarity: '<value>', claimedInvitesTableNameTrgmSimilarity: '<value>', submitInviteCodeFunctionTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### LevelsModule

```typescript
// List all levelsModules
const { data, isLoading } = useLevelsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true, stepsTableNameTrgmSimilarity: true, achievementsTableNameTrgmSimilarity: true, levelsTableNameTrgmSimilarity: true, levelRequirementsTableNameTrgmSimilarity: true, completedStepTrgmSimilarity: true, incompletedStepTrgmSimilarity: true, tgAchievementTrgmSimilarity: true, tgAchievementToggleTrgmSimilarity: true, tgAchievementToggleBooleanTrgmSimilarity: true, tgAchievementBooleanTrgmSimilarity: true, upsertAchievementTrgmSimilarity: true, tgUpdateAchievementsTrgmSimilarity: true, stepsRequiredTrgmSimilarity: true, levelAchievedTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Get one levelsModule
const { data: item } = useLevelsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true, stepsTableNameTrgmSimilarity: true, achievementsTableNameTrgmSimilarity: true, levelsTableNameTrgmSimilarity: true, levelRequirementsTableNameTrgmSimilarity: true, completedStepTrgmSimilarity: true, incompletedStepTrgmSimilarity: true, tgAchievementTrgmSimilarity: true, tgAchievementToggleTrgmSimilarity: true, tgAchievementToggleBooleanTrgmSimilarity: true, tgAchievementBooleanTrgmSimilarity: true, upsertAchievementTrgmSimilarity: true, tgUpdateAchievementsTrgmSimilarity: true, stepsRequiredTrgmSimilarity: true, levelAchievedTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Create a levelsModule
const { mutate: create } = useCreateLevelsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', stepsTableId: '<value>', stepsTableName: '<value>', achievementsTableId: '<value>', achievementsTableName: '<value>', levelsTableId: '<value>', levelsTableName: '<value>', levelRequirementsTableId: '<value>', levelRequirementsTableName: '<value>', completedStep: '<value>', incompletedStep: '<value>', tgAchievement: '<value>', tgAchievementToggle: '<value>', tgAchievementToggleBoolean: '<value>', tgAchievementBoolean: '<value>', upsertAchievement: '<value>', tgUpdateAchievements: '<value>', stepsRequired: '<value>', levelAchieved: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', stepsTableNameTrgmSimilarity: '<value>', achievementsTableNameTrgmSimilarity: '<value>', levelsTableNameTrgmSimilarity: '<value>', levelRequirementsTableNameTrgmSimilarity: '<value>', completedStepTrgmSimilarity: '<value>', incompletedStepTrgmSimilarity: '<value>', tgAchievementTrgmSimilarity: '<value>', tgAchievementToggleTrgmSimilarity: '<value>', tgAchievementToggleBooleanTrgmSimilarity: '<value>', tgAchievementBooleanTrgmSimilarity: '<value>', upsertAchievementTrgmSimilarity: '<value>', tgUpdateAchievementsTrgmSimilarity: '<value>', stepsRequiredTrgmSimilarity: '<value>', levelAchievedTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### LimitsModule

```typescript
// List all limitsModules
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true, tableNameTrgmSimilarity: true, defaultTableNameTrgmSimilarity: true, limitIncrementFunctionTrgmSimilarity: true, limitDecrementFunctionTrgmSimilarity: true, limitIncrementTriggerTrgmSimilarity: true, limitDecrementTriggerTrgmSimilarity: true, limitUpdateTriggerTrgmSimilarity: true, limitCheckFunctionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Get one limitsModule
const { data: item } = useLimitsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true, tableNameTrgmSimilarity: true, defaultTableNameTrgmSimilarity: true, limitIncrementFunctionTrgmSimilarity: true, limitDecrementFunctionTrgmSimilarity: true, limitIncrementTriggerTrgmSimilarity: true, limitDecrementTriggerTrgmSimilarity: true, limitUpdateTriggerTrgmSimilarity: true, limitCheckFunctionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Create a limitsModule
const { mutate: create } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', limitIncrementFunction: '<value>', limitDecrementFunction: '<value>', limitIncrementTrigger: '<value>', limitDecrementTrigger: '<value>', limitUpdateTrigger: '<value>', limitCheckFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', tableNameTrgmSimilarity: '<value>', defaultTableNameTrgmSimilarity: '<value>', limitIncrementFunctionTrgmSimilarity: '<value>', limitDecrementFunctionTrgmSimilarity: '<value>', limitIncrementTriggerTrgmSimilarity: '<value>', limitDecrementTriggerTrgmSimilarity: '<value>', limitUpdateTriggerTrgmSimilarity: '<value>', limitCheckFunctionTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### MembershipTypesModule

```typescript
// List all membershipTypesModules
const { data, isLoading } = useMembershipTypesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Get one membershipTypesModule
const { data: item } = useMembershipTypesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Create a membershipTypesModule
const { mutate: create } = useCreateMembershipTypesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### MembershipsModule

```typescript
// List all membershipsModules
const { data, isLoading } = useMembershipsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, membershipsTableNameTrgmSimilarity: true, membersTableNameTrgmSimilarity: true, membershipDefaultsTableNameTrgmSimilarity: true, grantsTableNameTrgmSimilarity: true, adminGrantsTableNameTrgmSimilarity: true, ownerGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, actorMaskCheckTrgmSimilarity: true, actorPermCheckTrgmSimilarity: true, entityIdsByMaskTrgmSimilarity: true, entityIdsByPermTrgmSimilarity: true, entityIdsFunctionTrgmSimilarity: true, searchScore: true } },
});

// Get one membershipsModule
const { data: item } = useMembershipsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, membershipsTableNameTrgmSimilarity: true, membersTableNameTrgmSimilarity: true, membershipDefaultsTableNameTrgmSimilarity: true, grantsTableNameTrgmSimilarity: true, adminGrantsTableNameTrgmSimilarity: true, ownerGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, actorMaskCheckTrgmSimilarity: true, actorPermCheckTrgmSimilarity: true, entityIdsByMaskTrgmSimilarity: true, entityIdsByPermTrgmSimilarity: true, entityIdsFunctionTrgmSimilarity: true, searchScore: true } },
});

// Create a membershipsModule
const { mutate: create } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', membershipsTableId: '<value>', membershipsTableName: '<value>', membersTableId: '<value>', membersTableName: '<value>', membershipDefaultsTableId: '<value>', membershipDefaultsTableName: '<value>', grantsTableId: '<value>', grantsTableName: '<value>', actorTableId: '<value>', limitsTableId: '<value>', defaultLimitsTableId: '<value>', permissionsTableId: '<value>', defaultPermissionsTableId: '<value>', sprtTableId: '<value>', adminGrantsTableId: '<value>', adminGrantsTableName: '<value>', ownerGrantsTableId: '<value>', ownerGrantsTableName: '<value>', membershipType: '<value>', entityTableId: '<value>', entityTableOwnerId: '<value>', prefix: '<value>', actorMaskCheck: '<value>', actorPermCheck: '<value>', entityIdsByMask: '<value>', entityIdsByPerm: '<value>', entityIdsFunction: '<value>', membershipsTableNameTrgmSimilarity: '<value>', membersTableNameTrgmSimilarity: '<value>', membershipDefaultsTableNameTrgmSimilarity: '<value>', grantsTableNameTrgmSimilarity: '<value>', adminGrantsTableNameTrgmSimilarity: '<value>', ownerGrantsTableNameTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', actorMaskCheckTrgmSimilarity: '<value>', actorPermCheckTrgmSimilarity: '<value>', entityIdsByMaskTrgmSimilarity: '<value>', entityIdsByPermTrgmSimilarity: '<value>', entityIdsFunctionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### PermissionsModule

```typescript
// List all permissionsModules
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, tableNameTrgmSimilarity: true, defaultTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, getPaddedMaskTrgmSimilarity: true, getMaskTrgmSimilarity: true, getByMaskTrgmSimilarity: true, getMaskByNameTrgmSimilarity: true, searchScore: true } },
});

// Get one permissionsModule
const { data: item } = usePermissionsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, tableNameTrgmSimilarity: true, defaultTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, getPaddedMaskTrgmSimilarity: true, getMaskTrgmSimilarity: true, getByMaskTrgmSimilarity: true, getMaskByNameTrgmSimilarity: true, searchScore: true } },
});

// Create a permissionsModule
const { mutate: create } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', bitlen: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', prefix: '<value>', getPaddedMask: '<value>', getMask: '<value>', getByMask: '<value>', getMaskByName: '<value>', tableNameTrgmSimilarity: '<value>', defaultTableNameTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', getPaddedMaskTrgmSimilarity: '<value>', getMaskTrgmSimilarity: '<value>', getByMaskTrgmSimilarity: '<value>', getMaskByNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### PhoneNumbersModule

```typescript
// List all phoneNumbersModules
const { data, isLoading } = usePhoneNumbersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Get one phoneNumbersModule
const { data: item } = usePhoneNumbersModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Create a phoneNumbersModule
const { mutate: create } = useCreatePhoneNumbersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ProfilesModule

```typescript
// List all profilesModules
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true, tableNameTrgmSimilarity: true, profilePermissionsTableNameTrgmSimilarity: true, profileGrantsTableNameTrgmSimilarity: true, profileDefinitionGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Get one profilesModule
const { data: item } = useProfilesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true, tableNameTrgmSimilarity: true, profilePermissionsTableNameTrgmSimilarity: true, profileGrantsTableNameTrgmSimilarity: true, profileDefinitionGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Create a profilesModule
const { mutate: create } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', profilePermissionsTableId: '<value>', profilePermissionsTableName: '<value>', profileGrantsTableId: '<value>', profileGrantsTableName: '<value>', profileDefinitionGrantsTableId: '<value>', profileDefinitionGrantsTableName: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', permissionsTableId: '<value>', membershipsTableId: '<value>', prefix: '<value>', tableNameTrgmSimilarity: '<value>', profilePermissionsTableNameTrgmSimilarity: '<value>', profileGrantsTableNameTrgmSimilarity: '<value>', profileDefinitionGrantsTableNameTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### SecretsModule

```typescript
// List all secretsModules
const { data, isLoading } = useSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Get one secretsModule
const { data: item } = useSecretsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});

// Create a secretsModule
const { mutate: create } = useCreateSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### SessionsModule

```typescript
// List all sessionsModules
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true, sessionsTableTrgmSimilarity: true, sessionCredentialsTableTrgmSimilarity: true, authSettingsTableTrgmSimilarity: true, searchScore: true } },
});

// Get one sessionsModule
const { data: item } = useSessionsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true, sessionsTableTrgmSimilarity: true, sessionCredentialsTableTrgmSimilarity: true, authSettingsTableTrgmSimilarity: true, searchScore: true } },
});

// Create a sessionsModule
const { mutate: create } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', authSettingsTableId: '<value>', usersTableId: '<value>', sessionsDefaultExpiration: '<value>', sessionsTable: '<value>', sessionCredentialsTable: '<value>', authSettingsTable: '<value>', sessionsTableTrgmSimilarity: '<value>', sessionCredentialsTableTrgmSimilarity: '<value>', authSettingsTableTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### UserAuthModule

```typescript
// List all userAuthModules
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true, auditsTableNameTrgmSimilarity: true, signInFunctionTrgmSimilarity: true, signUpFunctionTrgmSimilarity: true, signOutFunctionTrgmSimilarity: true, setPasswordFunctionTrgmSimilarity: true, resetPasswordFunctionTrgmSimilarity: true, forgotPasswordFunctionTrgmSimilarity: true, sendVerificationEmailFunctionTrgmSimilarity: true, verifyEmailFunctionTrgmSimilarity: true, verifyPasswordFunctionTrgmSimilarity: true, checkPasswordFunctionTrgmSimilarity: true, sendAccountDeletionEmailFunctionTrgmSimilarity: true, deleteAccountFunctionTrgmSimilarity: true, signInOneTimeTokenFunctionTrgmSimilarity: true, oneTimeTokenFunctionTrgmSimilarity: true, extendTokenExpiresTrgmSimilarity: true, searchScore: true } },
});

// Get one userAuthModule
const { data: item } = useUserAuthModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true, auditsTableNameTrgmSimilarity: true, signInFunctionTrgmSimilarity: true, signUpFunctionTrgmSimilarity: true, signOutFunctionTrgmSimilarity: true, setPasswordFunctionTrgmSimilarity: true, resetPasswordFunctionTrgmSimilarity: true, forgotPasswordFunctionTrgmSimilarity: true, sendVerificationEmailFunctionTrgmSimilarity: true, verifyEmailFunctionTrgmSimilarity: true, verifyPasswordFunctionTrgmSimilarity: true, checkPasswordFunctionTrgmSimilarity: true, sendAccountDeletionEmailFunctionTrgmSimilarity: true, deleteAccountFunctionTrgmSimilarity: true, signInOneTimeTokenFunctionTrgmSimilarity: true, oneTimeTokenFunctionTrgmSimilarity: true, extendTokenExpiresTrgmSimilarity: true, searchScore: true } },
});

// Create a userAuthModule
const { mutate: create } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', encryptedTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', auditsTableId: '<value>', auditsTableName: '<value>', signInFunction: '<value>', signUpFunction: '<value>', signOutFunction: '<value>', setPasswordFunction: '<value>', resetPasswordFunction: '<value>', forgotPasswordFunction: '<value>', sendVerificationEmailFunction: '<value>', verifyEmailFunction: '<value>', verifyPasswordFunction: '<value>', checkPasswordFunction: '<value>', sendAccountDeletionEmailFunction: '<value>', deleteAccountFunction: '<value>', signInOneTimeTokenFunction: '<value>', oneTimeTokenFunction: '<value>', extendTokenExpires: '<value>', auditsTableNameTrgmSimilarity: '<value>', signInFunctionTrgmSimilarity: '<value>', signUpFunctionTrgmSimilarity: '<value>', signOutFunctionTrgmSimilarity: '<value>', setPasswordFunctionTrgmSimilarity: '<value>', resetPasswordFunctionTrgmSimilarity: '<value>', forgotPasswordFunctionTrgmSimilarity: '<value>', sendVerificationEmailFunctionTrgmSimilarity: '<value>', verifyEmailFunctionTrgmSimilarity: '<value>', verifyPasswordFunctionTrgmSimilarity: '<value>', checkPasswordFunctionTrgmSimilarity: '<value>', sendAccountDeletionEmailFunctionTrgmSimilarity: '<value>', deleteAccountFunctionTrgmSimilarity: '<value>', signInOneTimeTokenFunctionTrgmSimilarity: '<value>', oneTimeTokenFunctionTrgmSimilarity: '<value>', extendTokenExpiresTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### UsersModule

```typescript
// List all usersModules
const { data, isLoading } = useUsersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true, tableNameTrgmSimilarity: true, typeTableNameTrgmSimilarity: true, searchScore: true } },
});

// Get one usersModule
const { data: item } = useUsersModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true, tableNameTrgmSimilarity: true, typeTableNameTrgmSimilarity: true, searchScore: true } },
});

// Create a usersModule
const { mutate: create } = useCreateUsersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', typeTableId: '<value>', typeTableName: '<value>', tableNameTrgmSimilarity: '<value>', typeTableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### UuidModule

```typescript
// List all uuidModules
const { data, isLoading } = useUuidModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true, uuidFunctionTrgmSimilarity: true, uuidSeedTrgmSimilarity: true, searchScore: true } },
});

// Get one uuidModule
const { data: item } = useUuidModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true, uuidFunctionTrgmSimilarity: true, uuidSeedTrgmSimilarity: true, searchScore: true } },
});

// Create a uuidModule
const { mutate: create } = useCreateUuidModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', uuidFunction: '<value>', uuidSeed: '<value>', uuidFunctionTrgmSimilarity: '<value>', uuidSeedTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### DatabaseProvisionModule

```typescript
// List all databaseProvisionModules
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true, databaseNameTrgmSimilarity: true, subdomainTrgmSimilarity: true, domainTrgmSimilarity: true, statusTrgmSimilarity: true, errorMessageTrgmSimilarity: true, searchScore: true } },
});

// Get one databaseProvisionModule
const { data: item } = useDatabaseProvisionModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true, databaseNameTrgmSimilarity: true, subdomainTrgmSimilarity: true, domainTrgmSimilarity: true, statusTrgmSimilarity: true, errorMessageTrgmSimilarity: true, searchScore: true } },
});

// Create a databaseProvisionModule
const { mutate: create } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseName: '<value>', ownerId: '<value>', subdomain: '<value>', domain: '<value>', modules: '<value>', options: '<value>', bootstrapUser: '<value>', status: '<value>', errorMessage: '<value>', databaseId: '<value>', completedAt: '<value>', databaseNameTrgmSimilarity: '<value>', subdomainTrgmSimilarity: '<value>', domainTrgmSimilarity: '<value>', statusTrgmSimilarity: '<value>', errorMessageTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AppAdminGrant

```typescript
// List all appAdminGrants
const { data, isLoading } = useAppAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appAdminGrant
const { data: item } = useAppAdminGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appAdminGrant
const { mutate: create } = useCreateAppAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```

### AppOwnerGrant

```typescript
// List all appOwnerGrants
const { data, isLoading } = useAppOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appOwnerGrant
const { data: item } = useAppOwnerGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appOwnerGrant
const { mutate: create } = useCreateAppOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```

### AppGrant

```typescript
// List all appGrants
const { data, isLoading } = useAppGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appGrant
const { data: item } = useAppGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appGrant
const { mutate: create } = useCreateAppGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>', isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```

### OrgMembership

```typescript
// List all orgMemberships
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } },
});

// Get one orgMembership
const { data: item } = useOrgMembershipQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } },
});

// Create a orgMembership
const { mutate: create } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', entityId: '<value>', profileId: '<value>' });
```

### OrgMember

```typescript
// List all orgMembers
const { data, isLoading } = useOrgMembersQuery({
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Get one orgMember
const { data: item } = useOrgMemberQuery({
  id: '<value>',
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Create a orgMember
const { mutate: create } = useCreateOrgMemberMutation({
  selection: { fields: { id: true } },
});
create({ isAdmin: '<value>', actorId: '<value>', entityId: '<value>' });
```

### OrgAdminGrant

```typescript
// List all orgAdminGrants
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgAdminGrant
const { data: item } = useOrgAdminGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgAdminGrant
const { mutate: create } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```

### OrgOwnerGrant

```typescript
// List all orgOwnerGrants
const { data, isLoading } = useOrgOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgOwnerGrant
const { data: item } = useOrgOwnerGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgOwnerGrant
const { mutate: create } = useCreateOrgOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```

### OrgGrant

```typescript
// List all orgGrants
const { data, isLoading } = useOrgGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgGrant
const { data: item } = useOrgGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgGrant
const { mutate: create } = useCreateOrgGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>', isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```

### OrgChartEdge

```typescript
// List all orgChartEdges
const { data, isLoading } = useOrgChartEdgesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true, positionTitleTrgmSimilarity: true, searchScore: true } },
});

// Get one orgChartEdge
const { data: item } = useOrgChartEdgeQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true, positionTitleTrgmSimilarity: true, searchScore: true } },
});

// Create a orgChartEdge
const { mutate: create } = useCreateOrgChartEdgeMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<value>', childId: '<value>', parentId: '<value>', positionTitle: '<value>', positionLevel: '<value>', positionTitleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### OrgChartEdgeGrant

```typescript
// List all orgChartEdgeGrants
const { data, isLoading } = useOrgChartEdgeGrantsQuery({
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true, positionTitleTrgmSimilarity: true, searchScore: true } },
});

// Get one orgChartEdgeGrant
const { data: item } = useOrgChartEdgeGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true, positionTitleTrgmSimilarity: true, searchScore: true } },
});

// Create a orgChartEdgeGrant
const { mutate: create } = useCreateOrgChartEdgeGrantMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<value>', childId: '<value>', parentId: '<value>', grantorId: '<value>', isGrant: '<value>', positionTitle: '<value>', positionLevel: '<value>', positionTitleTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AppLimit

```typescript
// List all appLimits
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});

// Get one appLimit
const { data: item } = useAppLimitQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});

// Create a appLimit
const { mutate: create } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', actorId: '<value>', num: '<value>', max: '<value>' });
```

### OrgLimit

```typescript
// List all orgLimits
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } },
});

// Get one orgLimit
const { data: item } = useOrgLimitQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } },
});

// Create a orgLimit
const { mutate: create } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', actorId: '<value>', num: '<value>', max: '<value>', entityId: '<value>' });
```

### AppStep

```typescript
// List all appSteps
const { data, isLoading } = useAppStepsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appStep
const { data: item } = useAppStepQuery({
  id: '<value>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appStep
const { mutate: create } = useCreateAppStepMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<value>', name: '<value>', count: '<value>' });
```

### AppAchievement

```typescript
// List all appAchievements
const { data, isLoading } = useAppAchievementsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appAchievement
const { data: item } = useAppAchievementQuery({
  id: '<value>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appAchievement
const { mutate: create } = useCreateAppAchievementMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<value>', name: '<value>', count: '<value>' });
```

### Invite

```typescript
// List all invites
const { data, isLoading } = useInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, inviteTokenTrgmSimilarity: true, searchScore: true } },
});

// Get one invite
const { data: item } = useInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, inviteTokenTrgmSimilarity: true, searchScore: true } },
});

// Create a invite
const { mutate: create } = useCreateInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<value>', senderId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', inviteTokenTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ClaimedInvite

```typescript
// List all claimedInvites
const { data, isLoading } = useClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Get one claimedInvite
const { data: item } = useClaimedInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Create a claimedInvite
const { mutate: create } = useCreateClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<value>', senderId: '<value>', receiverId: '<value>' });
```

### OrgInvite

```typescript
// List all orgInvites
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true, inviteTokenTrgmSimilarity: true, searchScore: true } },
});

// Get one orgInvite
const { data: item } = useOrgInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true, inviteTokenTrgmSimilarity: true, searchScore: true } },
});

// Create a orgInvite
const { mutate: create } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<value>', senderId: '<value>', receiverId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', entityId: '<value>', inviteTokenTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### OrgClaimedInvite

```typescript
// List all orgClaimedInvites
const { data, isLoading } = useOrgClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgClaimedInvite
const { data: item } = useOrgClaimedInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgClaimedInvite
const { mutate: create } = useCreateOrgClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<value>', senderId: '<value>', receiverId: '<value>', entityId: '<value>' });
```

### Ref

```typescript
// List all refs
const { data, isLoading } = useRefsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Get one ref
const { data: item } = useRefQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Create a ref
const { mutate: create } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', databaseId: '<value>', storeId: '<value>', commitId: '<value>', nameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Store

```typescript
// List all stores
const { data, isLoading } = useStoresQuery({
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Get one store
const { data: item } = useStoreQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true, nameTrgmSimilarity: true, searchScore: true } },
});

// Create a store
const { mutate: create } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', databaseId: '<value>', hash: '<value>', nameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AppPermissionDefault

```typescript
// List all appPermissionDefaults
const { data, isLoading } = useAppPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true } },
});

// Get one appPermissionDefault
const { data: item } = useAppPermissionDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true } },
});

// Create a appPermissionDefault
const { mutate: create } = useCreateAppPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>' });
```

### CryptoAddress

```typescript
// List all cryptoAddresses
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, addressTrgmSimilarity: true, searchScore: true } },
});

// Get one cryptoAddress
const { data: item } = useCryptoAddressQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, addressTrgmSimilarity: true, searchScore: true } },
});

// Create a cryptoAddress
const { mutate: create } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', address: '<value>', isVerified: '<value>', isPrimary: '<value>', addressTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### RoleType

```typescript
// List all roleTypes
const { data, isLoading } = useRoleTypesQuery({
  selection: { fields: { id: true, name: true } },
});

// Get one roleType
const { data: item } = useRoleTypeQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true } },
});

// Create a roleType
const { mutate: create } = useCreateRoleTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>' });
```

### OrgPermissionDefault

```typescript
// List all orgPermissionDefaults
const { data, isLoading } = useOrgPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Get one orgPermissionDefault
const { data: item } = useOrgPermissionDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Create a orgPermissionDefault
const { mutate: create } = useCreateOrgPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<value>', entityId: '<value>' });
```

### PhoneNumber

```typescript
// List all phoneNumbers
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, ccTrgmSimilarity: true, numberTrgmSimilarity: true, searchScore: true } },
});

// Get one phoneNumber
const { data: item } = usePhoneNumberQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, ccTrgmSimilarity: true, numberTrgmSimilarity: true, searchScore: true } },
});

// Create a phoneNumber
const { mutate: create } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', cc: '<value>', number: '<value>', isVerified: '<value>', isPrimary: '<value>', ccTrgmSimilarity: '<value>', numberTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AppLimitDefault

```typescript
// List all appLimitDefaults
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one appLimitDefault
const { data: item } = useAppLimitDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a appLimitDefault
const { mutate: create } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', max: '<value>' });
```

### OrgLimitDefault

```typescript
// List all orgLimitDefaults
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one orgLimitDefault
const { data: item } = useOrgLimitDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a orgLimitDefault
const { mutate: create } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', max: '<value>' });
```

### ConnectedAccount

```typescript
// List all connectedAccounts
const { data, isLoading } = useConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true, serviceTrgmSimilarity: true, identifierTrgmSimilarity: true, searchScore: true } },
});

// Get one connectedAccount
const { data: item } = useConnectedAccountQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true, serviceTrgmSimilarity: true, identifierTrgmSimilarity: true, searchScore: true } },
});

// Create a connectedAccount
const { mutate: create } = useCreateConnectedAccountMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', service: '<value>', identifier: '<value>', details: '<value>', isVerified: '<value>', serviceTrgmSimilarity: '<value>', identifierTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### NodeTypeRegistry

```typescript
// List all nodeTypeRegistries
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, slugTrgmSimilarity: true, categoryTrgmSimilarity: true, displayNameTrgmSimilarity: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Get one nodeTypeRegistry
const { data: item } = useNodeTypeRegistryQuery({
  name: '<value>',
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, slugTrgmSimilarity: true, categoryTrgmSimilarity: true, displayNameTrgmSimilarity: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Create a nodeTypeRegistry
const { mutate: create } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
create({ slug: '<value>', category: '<value>', displayName: '<value>', description: '<value>', parameterSchema: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', slugTrgmSimilarity: '<value>', categoryTrgmSimilarity: '<value>', displayNameTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### MembershipType

```typescript
// List all membershipTypes
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true, descriptionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Get one membershipType
const { data: item } = useMembershipTypeQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, description: true, prefix: true, descriptionTrgmSimilarity: true, prefixTrgmSimilarity: true, searchScore: true } },
});

// Create a membershipType
const { mutate: create } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', description: '<value>', prefix: '<value>', descriptionTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AppMembershipDefault

```typescript
// List all appMembershipDefaults
const { data, isLoading } = useAppMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Get one appMembershipDefault
const { data: item } = useAppMembershipDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Create a appMembershipDefault
const { mutate: create } = useCreateAppMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isVerified: '<value>' });
```

### RlsModule

```typescript
// List all rlsModules
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, authenticateTrgmSimilarity: true, authenticateStrictTrgmSimilarity: true, currentRoleTrgmSimilarity: true, currentRoleIdTrgmSimilarity: true, searchScore: true } },
});

// Get one rlsModule
const { data: item } = useRlsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, authenticateTrgmSimilarity: true, authenticateStrictTrgmSimilarity: true, currentRoleTrgmSimilarity: true, currentRoleIdTrgmSimilarity: true, searchScore: true } },
});

// Create a rlsModule
const { mutate: create } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', sessionCredentialsTableId: '<value>', sessionsTableId: '<value>', usersTableId: '<value>', authenticate: '<value>', authenticateStrict: '<value>', currentRole: '<value>', currentRoleId: '<value>', authenticateTrgmSimilarity: '<value>', authenticateStrictTrgmSimilarity: '<value>', currentRoleTrgmSimilarity: '<value>', currentRoleIdTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Commit

```typescript
// List all commits
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true, messageTrgmSimilarity: true, searchScore: true } },
});

// Get one commit
const { data: item } = useCommitQuery({
  id: '<value>',
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true, messageTrgmSimilarity: true, searchScore: true } },
});

// Create a commit
const { mutate: create } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<value>', databaseId: '<value>', storeId: '<value>', parentIds: '<value>', authorId: '<value>', committerId: '<value>', treeId: '<value>', date: '<value>', messageTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### OrgMembershipDefault

```typescript
// List all orgMembershipDefaults
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } },
});

// Get one orgMembershipDefault
const { data: item } = useOrgMembershipDefaultQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } },
});

// Create a orgMembershipDefault
const { mutate: create } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', entityId: '<value>', deleteMemberCascadeGroups: '<value>', createGroupsCascadeMembers: '<value>' });
```

### AuditLog

```typescript
// List all auditLogs
const { data, isLoading } = useAuditLogsQuery({
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true, userAgentTrgmSimilarity: true, searchScore: true } },
});

// Get one auditLog
const { data: item } = useAuditLogQuery({
  id: '<value>',
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true, userAgentTrgmSimilarity: true, searchScore: true } },
});

// Create a auditLog
const { mutate: create } = useCreateAuditLogMutation({
  selection: { fields: { id: true } },
});
create({ event: '<value>', actorId: '<value>', origin: '<value>', userAgent: '<value>', ipAddress: '<value>', success: '<value>', userAgentTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AppLevel

```typescript
// List all appLevels
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Get one appLevel
const { data: item } = useAppLevelQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true, descriptionTrgmSimilarity: true, searchScore: true } },
});

// Create a appLevel
const { mutate: create } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', description: '<value>', image: '<value>', ownerId: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### SqlMigration

```typescript
// List all sqlMigrations
const { data, isLoading } = useSqlMigrationsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, nameTrgmSimilarity: true, deployTrgmSimilarity: true, contentTrgmSimilarity: true, revertTrgmSimilarity: true, verifyTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } },
});

// Get one sqlMigration
const { data: item } = useSqlMigrationQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, nameTrgmSimilarity: true, deployTrgmSimilarity: true, contentTrgmSimilarity: true, revertTrgmSimilarity: true, verifyTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } },
});

// Create a sqlMigration
const { mutate: create } = useCreateSqlMigrationMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', databaseId: '<value>', deploy: '<value>', deps: '<value>', payload: '<value>', content: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>', nameTrgmSimilarity: '<value>', deployTrgmSimilarity: '<value>', contentTrgmSimilarity: '<value>', revertTrgmSimilarity: '<value>', verifyTrgmSimilarity: '<value>', actionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Email

```typescript
// List all emails
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Get one email
const { data: item } = useEmailQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Create a email
const { mutate: create } = useCreateEmailMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', email: '<value>', isVerified: '<value>', isPrimary: '<value>' });
```

### AstMigration

```typescript
// List all astMigrations
const { data, isLoading } = useAstMigrationsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, actionTrgmSimilarity: true, searchScore: true } },
});

// Get one astMigration
const { data: item } = useAstMigrationQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, actionTrgmSimilarity: true, searchScore: true } },
});

// Create a astMigration
const { mutate: create } = useCreateAstMigrationMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', requires: '<value>', payload: '<value>', deploys: '<value>', deploy: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>', actionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AppMembership

```typescript
// List all appMemberships
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Get one appMembership
const { data: item } = useAppMembershipQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Create a appMembership
const { mutate: create } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isVerified: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', profileId: '<value>' });
```

### User

```typescript
// List all users
const { data, isLoading } = useUsersQuery({
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Get one user
const { data: item } = useUserQuery({
  id: '<value>',
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Create a user
const { mutate: create } = useCreateUserMutation({
  selection: { fields: { id: true } },
});
create({ username: '<value>', displayName: '<value>', profilePicture: '<value>', searchTsv: '<value>', type: '<value>', searchTsvRank: '<value>', displayNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### HierarchyModule

```typescript
// List all hierarchyModules
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true, chartEdgesTableNameTrgmSimilarity: true, hierarchySprtTableNameTrgmSimilarity: true, chartEdgeGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, privateSchemaNameTrgmSimilarity: true, sprtTableNameTrgmSimilarity: true, rebuildHierarchyFunctionTrgmSimilarity: true, getSubordinatesFunctionTrgmSimilarity: true, getManagersFunctionTrgmSimilarity: true, isManagerOfFunctionTrgmSimilarity: true, searchScore: true } },
});

// Get one hierarchyModule
const { data: item } = useHierarchyModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true, chartEdgesTableNameTrgmSimilarity: true, hierarchySprtTableNameTrgmSimilarity: true, chartEdgeGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, privateSchemaNameTrgmSimilarity: true, sprtTableNameTrgmSimilarity: true, rebuildHierarchyFunctionTrgmSimilarity: true, getSubordinatesFunctionTrgmSimilarity: true, getManagersFunctionTrgmSimilarity: true, isManagerOfFunctionTrgmSimilarity: true, searchScore: true } },
});

// Create a hierarchyModule
const { mutate: create } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', chartEdgesTableId: '<value>', chartEdgesTableName: '<value>', hierarchySprtTableId: '<value>', hierarchySprtTableName: '<value>', chartEdgeGrantsTableId: '<value>', chartEdgeGrantsTableName: '<value>', entityTableId: '<value>', usersTableId: '<value>', prefix: '<value>', privateSchemaName: '<value>', sprtTableName: '<value>', rebuildHierarchyFunction: '<value>', getSubordinatesFunction: '<value>', getManagersFunction: '<value>', isManagerOfFunction: '<value>', chartEdgesTableNameTrgmSimilarity: '<value>', hierarchySprtTableNameTrgmSimilarity: '<value>', chartEdgeGrantsTableNameTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', privateSchemaNameTrgmSimilarity: '<value>', sprtTableNameTrgmSimilarity: '<value>', rebuildHierarchyFunctionTrgmSimilarity: '<value>', getSubordinatesFunctionTrgmSimilarity: '<value>', getManagersFunctionTrgmSimilarity: '<value>', isManagerOfFunctionTrgmSimilarity: '<value>', searchScore: '<value>' });
```

## Custom Operation Hooks

### `useCurrentUserIdQuery`

currentUserId

- **Type:** query
- **Arguments:** none

### `useCurrentIpAddressQuery`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `useCurrentUserAgentQuery`

currentUserAgent

- **Type:** query
- **Arguments:** none

### `useAppPermissionsGetPaddedMaskQuery`

appPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

### `useOrgPermissionsGetPaddedMaskQuery`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

### `useStepsAchievedQuery`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |

### `useRevParseQuery`

revParse

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `dbId` | UUID |
  | `storeId` | UUID |
  | `refname` | String |

### `useOrgIsManagerOfQuery`

orgIsManagerOf

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `pEntityId` | UUID |
  | `pManagerId` | UUID |
  | `pUserId` | UUID |
  | `pMaxDepth` | Int |

### `useAppPermissionsGetMaskQuery`

appPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

### `useOrgPermissionsGetMaskQuery`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

### `useAppPermissionsGetMaskByNamesQuery`

appPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

### `useOrgPermissionsGetMaskByNamesQuery`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

### `useAppPermissionsGetByMaskQuery`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useOrgPermissionsGetByMaskQuery`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useGetAllObjectsFromRootQuery`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `id` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useGetPathObjectsFromRootQuery`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `id` | UUID |
  | `path` | [String] |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useGetObjectAtPathQuery`

getObjectAtPath

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `dbId` | UUID |
  | `storeId` | UUID |
  | `path` | [String] |
  | `refname` | String |

### `useStepsRequiredQuery`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useCurrentUserQuery`

currentUser

- **Type:** query
- **Arguments:** none

### `useSignOutMutation`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignOutInput (required) |

### `useSendAccountDeletionEmailMutation`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendAccountDeletionEmailInput (required) |

### `useCheckPasswordMutation`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CheckPasswordInput (required) |

### `useSubmitInviteCodeMutation`

submitInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitInviteCodeInput (required) |

### `useSubmitOrgInviteCodeMutation`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitOrgInviteCodeInput (required) |

### `useFreezeObjectsMutation`

freezeObjects

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | FreezeObjectsInput (required) |

### `useInitEmptyRepoMutation`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

### `useConfirmDeleteAccountMutation`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmDeleteAccountInput (required) |

### `useSetPasswordMutation`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPasswordInput (required) |

### `useVerifyEmailMutation`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyEmailInput (required) |

### `useResetPasswordMutation`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

### `useBootstrapUserMutation`

bootstrapUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | BootstrapUserInput (required) |

### `useRemoveNodeAtPathMutation`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RemoveNodeAtPathInput (required) |

### `useSetDataAtPathMutation`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

### `useSetPropsAndCommitMutation`

setPropsAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPropsAndCommitInput (required) |

### `useProvisionDatabaseWithUserMutation`

provisionDatabaseWithUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionDatabaseWithUserInput (required) |

### `useSignInOneTimeTokenMutation`

signInOneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInOneTimeTokenInput (required) |

### `useCreateUserDatabaseMutation`

Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include levels/achievements (default: false)
  - bitlen: Bit length for permission masks (default: 64)
  - tokens_expiration: Token expiration interval (default: 30 days)

Returns the database_id UUID of the newly created database.

Example usage:
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, true, true);  -- with invites and groups


- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CreateUserDatabaseInput (required) |

### `useExtendTokenExpiresMutation`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExtendTokenExpiresInput (required) |

### `useSignInMutation`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

### `useSignUpMutation`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

### `useSetFieldOrderMutation`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetFieldOrderInput (required) |

### `useOneTimeTokenMutation`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OneTimeTokenInput (required) |

### `useInsertNodeAtPathMutation`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InsertNodeAtPathInput (required) |

### `useUpdateNodeAtPathMutation`

updateNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | UpdateNodeAtPathInput (required) |

### `useSetAndCommitMutation`

setAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetAndCommitInput (required) |

### `useApplyRlsMutation`

applyRls

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ApplyRlsInput (required) |

### `useForgotPasswordMutation`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ForgotPasswordInput (required) |

### `useSendVerificationEmailMutation`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendVerificationEmailInput (required) |

### `useVerifyPasswordMutation`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyPasswordInput (required) |

### `useVerifyTotpMutation`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyTotpInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
