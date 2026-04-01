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
| `useObjectsQuery` | Query | List all objects |
| `useObjectQuery` | Query | Get one object |
| `useCreateObjectMutation` | Mutation | Create a object |
| `useUpdateObjectMutation` | Mutation | Update a object |
| `useDeleteObjectMutation` | Mutation | Delete a object |
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
| `useEmbeddingChunksQuery` | Query | List all embeddingChunks |
| `useEmbeddingChunkQuery` | Query | Get one embeddingChunk |
| `useCreateEmbeddingChunkMutation` | Mutation | Create a embeddingChunk |
| `useUpdateEmbeddingChunkMutation` | Mutation | Update a embeddingChunk |
| `useDeleteEmbeddingChunkMutation` | Mutation | Delete a embeddingChunk |
| `useTableTemplateModulesQuery` | Query | List all tableTemplateModules |
| `useTableTemplateModuleQuery` | Query | Get one tableTemplateModule |
| `useCreateTableTemplateModuleMutation` | Mutation | Create a tableTemplateModule |
| `useUpdateTableTemplateModuleMutation` | Mutation | Update a tableTemplateModule |
| `useDeleteTableTemplateModuleMutation` | Mutation | Delete a tableTemplateModule |
| `useSecureTableProvisionsQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useSecureTableProvisionQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useCreateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useUpdateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useDeleteSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
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
| `useEnumsQuery` | Query | List all enums |
| `useEnumQuery` | Query | Get one enum |
| `useCreateEnumMutation` | Mutation | Create a enum |
| `useUpdateEnumMutation` | Mutation | Update a enum |
| `useDeleteEnumMutation` | Mutation | Delete a enum |
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
| `useDatabaseTransfersQuery` | Query | List all databaseTransfers |
| `useDatabaseTransferQuery` | Query | Get one databaseTransfer |
| `useCreateDatabaseTransferMutation` | Mutation | Create a databaseTransfer |
| `useUpdateDatabaseTransferMutation` | Mutation | Update a databaseTransfer |
| `useDeleteDatabaseTransferMutation` | Mutation | Delete a databaseTransfer |
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
| `useBlueprintsQuery` | Query | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useBlueprintQuery` | Query | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useCreateBlueprintMutation` | Mutation | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useUpdateBlueprintMutation` | Mutation | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useDeleteBlueprintMutation` | Mutation | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useBlueprintTemplatesQuery` | Query | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useBlueprintTemplateQuery` | Query | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useCreateBlueprintTemplateMutation` | Mutation | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useUpdateBlueprintTemplateMutation` | Mutation | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useDeleteBlueprintTemplateMutation` | Mutation | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useBlueprintConstructionsQuery` | Query | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useBlueprintConstructionQuery` | Query | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useCreateBlueprintConstructionMutation` | Mutation | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useUpdateBlueprintConstructionMutation` | Mutation | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useDeleteBlueprintConstructionMutation` | Mutation | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useStorageModulesQuery` | Query | List all storageModules |
| `useStorageModuleQuery` | Query | Get one storageModule |
| `useCreateStorageModuleMutation` | Mutation | Create a storageModule |
| `useUpdateStorageModuleMutation` | Mutation | Update a storageModule |
| `useDeleteStorageModuleMutation` | Mutation | Delete a storageModule |
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
| `useOrgPermissionDefaultsQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useOrgPermissionDefaultQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useCreateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useUpdateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useDeleteOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
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
| `useAppLevelsQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useAppLevelQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useCreateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useUpdateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useDeleteAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useEmailsQuery` | Query | User email addresses with verification and primary-email management |
| `useEmailQuery` | Query | User email addresses with verification and primary-email management |
| `useCreateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useUpdateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useDeleteEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `usePhoneNumbersQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `usePhoneNumberQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `useCreatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useUpdatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useDeletePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useCryptoAddressesQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCryptoAddressQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCreateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useUpdateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useDeleteCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useConnectedAccountsQuery` | Query | OAuth and social login connections linking external service accounts to users |
| `useConnectedAccountQuery` | Query | OAuth and social login connections linking external service accounts to users |
| `useCreateConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useUpdateConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useDeleteConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
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
| `useAuditLogsQuery` | Query | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useAuditLogQuery` | Query | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useCreateAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useUpdateAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useDeleteAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
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
| `useRoleTypesQuery` | Query | List all roleTypes |
| `useRoleTypeQuery` | Query | Get one roleType |
| `useCreateRoleTypeMutation` | Mutation | Create a roleType |
| `useUpdateRoleTypeMutation` | Mutation | Update a roleType |
| `useDeleteRoleTypeMutation` | Mutation | Delete a roleType |
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
| `useMigrateFilesQuery` | Query | List all migrateFiles |
| `useMigrateFileQuery` | Query | Get one migrateFile |
| `useCreateMigrateFileMutation` | Mutation | Create a migrateFile |
| `useUpdateMigrateFileMutation` | Mutation | Update a migrateFile |
| `useDeleteMigrateFileMutation` | Mutation | Delete a migrateFile |
| `useMembershipTypesQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useMembershipTypeQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useCreateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useUpdateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useDeleteMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useCommitsQuery` | Query | A commit records changes to the repository. |
| `useCommitQuery` | Query | A commit records changes to the repository. |
| `useCreateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useUpdateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useDeleteCommitMutation` | Mutation | A commit records changes to the repository. |
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
| `useNodeTypeRegistriesQuery` | Query | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useNodeTypeRegistryQuery` | Query | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useCreateNodeTypeRegistryMutation` | Mutation | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useUpdateNodeTypeRegistryMutation` | Mutation | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useDeleteNodeTypeRegistryMutation` | Mutation | Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.). |
| `useOrgMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useSqlActionsQuery` | Query | List all sqlActions |
| `useSqlActionQuery` | Query | Get one sqlAction |
| `useCreateSqlActionMutation` | Mutation | Create a sqlAction |
| `useUpdateSqlActionMutation` | Mutation | Update a sqlAction |
| `useDeleteSqlActionMutation` | Mutation | Delete a sqlAction |
| `useUsersQuery` | Query | List all users |
| `useUserQuery` | Query | Get one user |
| `useCreateUserMutation` | Mutation | Create a user |
| `useUpdateUserMutation` | Mutation | Update a user |
| `useDeleteUserMutation` | Mutation | Delete a user |
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
| `useResolveBlueprintTableQuery` | Query | Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error. |
| `useAppPermissionsGetMaskByNamesQuery` | Query | appPermissionsGetMaskByNames |
| `useOrgPermissionsGetMaskByNamesQuery` | Query | orgPermissionsGetMaskByNames |
| `useGetAllObjectsFromRootQuery` | Query | Reads and enables pagination through a set of `Object`. |
| `useGetPathObjectsFromRootQuery` | Query | Reads and enables pagination through a set of `Object`. |
| `useGetObjectAtPathQuery` | Query | getObjectAtPath |
| `useAppPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `AppPermission`. |
| `useOrgPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `OrgPermission`. |
| `useStepsRequiredQuery` | Query | Reads and enables pagination through a set of `AppLevelRequirement`. |
| `useCurrentUserQuery` | Query | currentUser |
| `useSendAccountDeletionEmailMutation` | Mutation | sendAccountDeletionEmail |
| `useSignOutMutation` | Mutation | signOut |
| `useAcceptDatabaseTransferMutation` | Mutation | acceptDatabaseTransfer |
| `useCancelDatabaseTransferMutation` | Mutation | cancelDatabaseTransfer |
| `useRejectDatabaseTransferMutation` | Mutation | rejectDatabaseTransfer |
| `useSubmitInviteCodeMutation` | Mutation | submitInviteCode |
| `useSubmitOrgInviteCodeMutation` | Mutation | submitOrgInviteCode |
| `useCheckPasswordMutation` | Mutation | checkPassword |
| `useConfirmDeleteAccountMutation` | Mutation | confirmDeleteAccount |
| `useSetPasswordMutation` | Mutation | setPassword |
| `useVerifyEmailMutation` | Mutation | verifyEmail |
| `useFreezeObjectsMutation` | Mutation | freezeObjects |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useConstructBlueprintMutation` | Mutation | Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Five phases: (1) provision_table() for each table with all nodes[], fields[], policies[], grants, and table-level indexes/fts/unique_constraints in a single call, (2) provision_relation() for each relation, (3) provision_index() for top-level indexes, (4) provision_full_text_search() for top-level FTS, (5) provision_unique_constraint() for top-level unique constraints. Tables are identified by table_name with optional per-table schema_name. Relations use $type for relation_type with source_table/target_table. Returns the construction record ID on success, NULL on failure. |
| `useResetPasswordMutation` | Mutation | resetPassword |
| `useRemoveNodeAtPathMutation` | Mutation | removeNodeAtPath |
| `useCopyTemplateToBlueprintMutation` | Mutation | Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID. |
| `useBootstrapUserMutation` | Mutation | bootstrapUser |
| `useSetFieldOrderMutation` | Mutation | setFieldOrder |
| `useProvisionUniqueConstraintMutation` | Mutation | Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists. |
| `useProvisionFullTextSearchMutation` | Mutation | Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id. |
| `useProvisionIndexMutation` | Mutation | Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id. |
| `useSetDataAtPathMutation` | Mutation | setDataAtPath |
| `useSetPropsAndCommitMutation` | Mutation | setPropsAndCommit |
| `useProvisionDatabaseWithUserMutation` | Mutation | provisionDatabaseWithUser |
| `useInsertNodeAtPathMutation` | Mutation | insertNodeAtPath |
| `useUpdateNodeAtPathMutation` | Mutation | updateNodeAtPath |
| `useSetAndCommitMutation` | Mutation | setAndCommit |
| `useProvisionRelationMutation` | Mutation | Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id). |
| `useApplyRlsMutation` | Mutation | applyRls |
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
| `useOneTimeTokenMutation` | Mutation | oneTimeToken |
| `useProvisionTableMutation` | Mutation | Composable table provisioning: creates or finds a table, then applies N nodes (Data* modules), creates fields, enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields). |
| `useSendVerificationEmailMutation` | Mutation | sendVerificationEmail |
| `useForgotPasswordMutation` | Mutation | forgotPassword |
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
create({ userId: '<UUID>', depth: '<Int>' });
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
create({ userId: '<UUID>', depth: '<Int>' });
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
create({ path: '<String>', data: '<JSON>' });
```

### Object

```typescript
// List all objects
const { data, isLoading } = useObjectsQuery({
  selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Get one object
const { data: item } = useObjectQuery({
  id: '<UUID>',
  selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Create a object
const { mutate: create } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
create({ hashUuid: '<UUID>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>', frzn: '<Boolean>' });
```

### AppPermission

```typescript
// List all appPermissions
const { data, isLoading } = useAppPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one appPermission
const { data: item } = useAppPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a appPermission
const { mutate: create } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' });
```

### OrgPermission

```typescript
// List all orgPermissions
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one orgPermission
const { data: item } = useOrgPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a orgPermission
const { mutate: create } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' });
```

### AppLevelRequirement

```typescript
// List all appLevelRequirements
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Get one appLevelRequirement
const { data: item } = useAppLevelRequirementQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Create a appLevelRequirement
const { mutate: create } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', level: '<String>', description: '<String>', requiredCount: '<Int>', priority: '<Int>' });
```

### Database

```typescript
// List all databases
const { data, isLoading } = useDatabasesQuery({
  selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } },
});

// Get one database
const { data: item } = useDatabaseQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } },
});

// Create a database
const { mutate: create } = useCreateDatabaseMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', schemaHash: '<String>', name: '<String>', label: '<String>', hash: '<UUID>' });
```

### Schema

```typescript
// List all schemas
const { data, isLoading } = useSchemasQuery({
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } },
});

// Get one schema
const { data: item } = useSchemaQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } },
});

// Create a schema
const { mutate: create } = useCreateSchemaMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', schemaName: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>', isPublic: '<Boolean>' });
```

### Table

```typescript
// List all tables
const { data, isLoading } = useTablesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } },
});

// Get one table
const { data: item } = useTableQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } },
});

// Create a table
const { mutate: create } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', inheritsId: '<UUID>' });
```

### CheckConstraint

```typescript
// List all checkConstraints
const { data, isLoading } = useCheckConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one checkConstraint
const { data: item } = useCheckConstraintQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a checkConstraint
const { mutate: create } = useCreateCheckConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', expr: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### Field

```typescript
// List all fields
const { data, isLoading } = useFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, defaultValueAst: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});

// Get one field
const { data: item } = useFieldQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, defaultValueAst: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});

// Create a field
const { mutate: create } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', isRequired: '<Boolean>', apiRequired: '<Boolean>', defaultValue: '<String>', defaultValueAst: '<JSON>', type: '<String>', fieldOrder: '<Int>', regexp: '<String>', chk: '<JSON>', chkExpr: '<JSON>', min: '<Float>', max: '<Float>', tags: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>' });
```

### ForeignKeyConstraint

```typescript
// List all foreignKeyConstraints
const { data, isLoading } = useForeignKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one foreignKeyConstraint
const { data: item } = useForeignKeyConstraintQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a foreignKeyConstraint
const { mutate: create } = useCreateForeignKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', refTableId: '<UUID>', refFieldIds: '<UUID>', deleteAction: '<String>', updateAction: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### FullTextSearch

```typescript
// List all fullTextSearches
const { data, isLoading } = useFullTextSearchesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } },
});

// Get one fullTextSearch
const { data: item } = useFullTextSearchQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, createdAt: true, updatedAt: true } },
});

// Create a fullTextSearch
const { mutate: create } = useCreateFullTextSearchMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', weights: '<String>', langs: '<String>' });
```

### Index

```typescript
// List all indices
const { data, isLoading } = useIndicesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, options: true, opClasses: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one index
const { data: item } = useIndexQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, options: true, opClasses: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a index
const { mutate: create } = useCreateIndexMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', accessMethod: '<String>', indexParams: '<JSON>', whereClause: '<JSON>', isUnique: '<Boolean>', options: '<JSON>', opClasses: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### Policy

```typescript
// List all policies
const { data, isLoading } = usePoliciesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one policy
const { data: item } = usePolicyQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a policy
const { mutate: create } = useCreatePolicyMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', granteeName: '<String>', privilege: '<String>', permissive: '<Boolean>', disabled: '<Boolean>', policyType: '<String>', data: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### PrimaryKeyConstraint

```typescript
// List all primaryKeyConstraints
const { data, isLoading } = usePrimaryKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one primaryKeyConstraint
const { data: item } = usePrimaryKeyConstraintQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a primaryKeyConstraint
const { mutate: create } = useCreatePrimaryKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### TableGrant

```typescript
// List all tableGrants
const { data, isLoading } = useTableGrantsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true } },
});

// Get one tableGrant
const { data: item } = useTableGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true } },
});

// Create a tableGrant
const { mutate: create } = useCreateTableGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', privilege: '<String>', granteeName: '<String>', fieldIds: '<UUID>', isGrant: '<Boolean>' });
```

### Trigger

```typescript
// List all triggers
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one trigger
const { data: item } = useTriggerQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a trigger
const { mutate: create } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', event: '<String>', functionName: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### UniqueConstraint

```typescript
// List all uniqueConstraints
const { data, isLoading } = useUniqueConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one uniqueConstraint
const { data: item } = useUniqueConstraintQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a uniqueConstraint
const { mutate: create } = useCreateUniqueConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### View

```typescript
// List all views
const { data, isLoading } = useViewsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});

// Get one view
const { data: item } = useViewQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});

// Create a view
const { mutate: create } = useCreateViewMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', tableId: '<UUID>', viewType: '<String>', data: '<JSON>', filterType: '<String>', filterData: '<JSON>', securityInvoker: '<Boolean>', isReadOnly: '<Boolean>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### ViewTable

```typescript
// List all viewTables
const { data, isLoading } = useViewTablesQuery({
  selection: { fields: { id: true, viewId: true, tableId: true, joinOrder: true } },
});

// Get one viewTable
const { data: item } = useViewTableQuery({
  id: '<UUID>',
  selection: { fields: { id: true, viewId: true, tableId: true, joinOrder: true } },
});

// Create a viewTable
const { mutate: create } = useCreateViewTableMutation({
  selection: { fields: { id: true } },
});
create({ viewId: '<UUID>', tableId: '<UUID>', joinOrder: '<Int>' });
```

### ViewGrant

```typescript
// List all viewGrants
const { data, isLoading } = useViewGrantsQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true } },
});

// Get one viewGrant
const { data: item } = useViewGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true } },
});

// Create a viewGrant
const { mutate: create } = useCreateViewGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', viewId: '<UUID>', granteeName: '<String>', privilege: '<String>', withGrantOption: '<Boolean>', isGrant: '<Boolean>' });
```

### ViewRule

```typescript
// List all viewRules
const { data, isLoading } = useViewRulesQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } },
});

// Get one viewRule
const { data: item } = useViewRuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } },
});

// Create a viewRule
const { mutate: create } = useCreateViewRuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', viewId: '<UUID>', name: '<String>', event: '<String>', action: '<String>' });
```

### EmbeddingChunk

```typescript
// List all embeddingChunks
const { data, isLoading } = useEmbeddingChunksQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, enqueueChunkingJob: true, chunkingTaskName: true, parentFkFieldId: true, createdAt: true, updatedAt: true } },
});

// Get one embeddingChunk
const { data: item } = useEmbeddingChunkQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, enqueueChunkingJob: true, chunkingTaskName: true, parentFkFieldId: true, createdAt: true, updatedAt: true } },
});

// Create a embeddingChunk
const { mutate: create } = useCreateEmbeddingChunkMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', embeddingFieldId: '<UUID>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', dimensions: '<Int>', metric: '<String>', chunkSize: '<Int>', chunkOverlap: '<Int>', chunkStrategy: '<String>', metadataFields: '<JSON>', enqueueChunkingJob: '<Boolean>', chunkingTaskName: '<String>', parentFkFieldId: '<UUID>' });
```

### TableTemplateModule

```typescript
// List all tableTemplateModules
const { data, isLoading } = useTableTemplateModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } },
});

// Get one tableTemplateModule
const { data: item } = useTableTemplateModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } },
});

// Create a tableTemplateModule
const { mutate: create } = useCreateTableTemplateModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', nodeType: '<String>', data: '<JSON>' });
```

### SecureTableProvision

```typescript
// List all secureTableProvisions
const { data, isLoading } = useSecureTableProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodes: true, useRls: true, fields: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } },
});

// Get one secureTableProvision
const { data: item } = useSecureTableProvisionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodes: true, useRls: true, fields: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } },
});

// Create a secureTableProvision
const { mutate: create } = useCreateSecureTableProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', nodes: '<JSON>', useRls: '<Boolean>', fields: '<JSON>', grantRoles: '<String>', grantPrivileges: '<JSON>', policyType: '<String>', policyPrivileges: '<String>', policyRole: '<String>', policyPermissive: '<Boolean>', policyName: '<String>', policyData: '<JSON>', outFields: '<UUID>' });
```

### RelationProvision

```typescript
// List all relationProvisions
const { data, isLoading } = useRelationProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, apiRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, createIndex: true, exposeInApi: true, nodes: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true } },
});

// Get one relationProvision
const { data: item } = useRelationProvisionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, apiRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, createIndex: true, exposeInApi: true, nodes: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true } },
});

// Create a relationProvision
const { mutate: create } = useCreateRelationProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', relationType: '<String>', sourceTableId: '<UUID>', targetTableId: '<UUID>', fieldName: '<String>', deleteAction: '<String>', isRequired: '<Boolean>', apiRequired: '<Boolean>', junctionTableId: '<UUID>', junctionTableName: '<String>', junctionSchemaId: '<UUID>', sourceFieldName: '<String>', targetFieldName: '<String>', useCompositeKey: '<Boolean>', createIndex: '<Boolean>', exposeInApi: '<Boolean>', nodes: '<JSON>', grantRoles: '<String>', grantPrivileges: '<JSON>', policyType: '<String>', policyPrivileges: '<String>', policyRole: '<String>', policyPermissive: '<Boolean>', policyName: '<String>', policyData: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>' });
```

### SchemaGrant

```typescript
// List all schemaGrants
const { data, isLoading } = useSchemaGrantsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } },
});

// Get one schemaGrant
const { data: item } = useSchemaGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } },
});

// Create a schemaGrant
const { mutate: create } = useCreateSchemaGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', granteeName: '<String>' });
```

### DefaultPrivilege

```typescript
// List all defaultPrivileges
const { data, isLoading } = useDefaultPrivilegesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true } },
});

// Get one defaultPrivilege
const { data: item } = useDefaultPrivilegeQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, objectType: true, privilege: true, granteeName: true, isGrant: true } },
});

// Create a defaultPrivilege
const { mutate: create } = useCreateDefaultPrivilegeMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', objectType: '<String>', privilege: '<String>', granteeName: '<String>', isGrant: '<Boolean>' });
```

### Enum

```typescript
// List all enums
const { data, isLoading } = useEnumsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, values: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});

// Get one enum
const { data: item } = useEnumQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, values: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});

// Create a enum
const { mutate: create } = useCreateEnumMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', values: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```

### ApiSchema

```typescript
// List all apiSchemas
const { data, isLoading } = useApiSchemasQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, apiId: true } },
});

// Get one apiSchema
const { data: item } = useApiSchemaQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, apiId: true } },
});

// Create a apiSchema
const { mutate: create } = useCreateApiSchemaMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', apiId: '<UUID>' });
```

### ApiModule

```typescript
// List all apiModules
const { data, isLoading } = useApiModulesQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } },
});

// Get one apiModule
const { data: item } = useApiModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } },
});

// Create a apiModule
const { mutate: create } = useCreateApiModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', apiId: '<UUID>', name: '<String>', data: '<JSON>' });
```

### Domain

```typescript
// List all domains
const { data, isLoading } = useDomainsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } },
});

// Get one domain
const { data: item } = useDomainQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, apiId: true, siteId: true, subdomain: true, domain: true } },
});

// Create a domain
const { mutate: create } = useCreateDomainMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', apiId: '<UUID>', siteId: '<UUID>', subdomain: '<Hostname>', domain: '<Hostname>' });
```

### SiteMetadatum

```typescript
// List all siteMetadata
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } },
});

// Get one siteMetadatum
const { data: item } = useSiteMetadatumQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } },
});

// Create a siteMetadatum
const { mutate: create } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', siteId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>' });
```

### SiteModule

```typescript
// List all siteModules
const { data, isLoading } = useSiteModulesQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true } },
});

// Get one siteModule
const { data: item } = useSiteModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true } },
});

// Create a siteModule
const { mutate: create } = useCreateSiteModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', siteId: '<UUID>', name: '<String>', data: '<JSON>' });
```

### SiteTheme

```typescript
// List all siteThemes
const { data, isLoading } = useSiteThemesQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, theme: true } },
});

// Get one siteTheme
const { data: item } = useSiteThemeQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, siteId: true, theme: true } },
});

// Create a siteTheme
const { mutate: create } = useCreateSiteThemeMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', siteId: '<UUID>', theme: '<JSON>' });
```

### TriggerFunction

```typescript
// List all triggerFunctions
const { data, isLoading } = useTriggerFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true } },
});

// Get one triggerFunction
const { data: item } = useTriggerFunctionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true } },
});

// Create a triggerFunction
const { mutate: create } = useCreateTriggerFunctionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', code: '<String>' });
```

### DatabaseTransfer

```typescript
// List all databaseTransfers
const { data, isLoading } = useDatabaseTransfersQuery({
  selection: { fields: { id: true, databaseId: true, targetOwnerId: true, sourceApproved: true, targetApproved: true, sourceApprovedAt: true, targetApprovedAt: true, status: true, initiatedBy: true, notes: true, expiresAt: true, createdAt: true, updatedAt: true, completedAt: true } },
});

// Get one databaseTransfer
const { data: item } = useDatabaseTransferQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, targetOwnerId: true, sourceApproved: true, targetApproved: true, sourceApprovedAt: true, targetApprovedAt: true, status: true, initiatedBy: true, notes: true, expiresAt: true, createdAt: true, updatedAt: true, completedAt: true } },
});

// Create a databaseTransfer
const { mutate: create } = useCreateDatabaseTransferMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', targetOwnerId: '<UUID>', sourceApproved: '<Boolean>', targetApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', targetApprovedAt: '<Datetime>', status: '<String>', initiatedBy: '<UUID>', notes: '<String>', expiresAt: '<Datetime>', completedAt: '<Datetime>' });
```

### Api

```typescript
// List all apis
const { data, isLoading } = useApisQuery({
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } },
});

// Get one api
const { data: item } = useApiQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } },
});

// Create a api
const { mutate: create } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', dbname: '<String>', roleName: '<String>', anonRole: '<String>', isPublic: '<Boolean>' });
```

### Site

```typescript
// List all sites
const { data, isLoading } = useSitesQuery({
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } },
});

// Get one site
const { data: item } = useSiteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } },
});

// Create a site
const { mutate: create } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>', favicon: '<Attachment>', appleTouchIcon: '<Image>', logo: '<Image>', dbname: '<String>' });
```

### App

```typescript
// List all apps
const { data, isLoading } = useAppsQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } },
});

// Get one app
const { data: item } = useAppQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } },
});

// Create a app
const { mutate: create } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', siteId: '<UUID>', name: '<String>', appImage: '<Image>', appStoreLink: '<Url>', appStoreId: '<String>', appIdPrefix: '<String>', playStoreLink: '<Url>' });
```

### ConnectedAccountsModule

```typescript
// List all connectedAccountsModules
const { data, isLoading } = useConnectedAccountsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Get one connectedAccountsModule
const { data: item } = useConnectedAccountsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Create a connectedAccountsModule
const { mutate: create } = useCreateConnectedAccountsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' });
```

### CryptoAddressesModule

```typescript
// List all cryptoAddressesModules
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } },
});

// Get one cryptoAddressesModule
const { data: item } = useCryptoAddressesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } },
});

// Create a cryptoAddressesModule
const { mutate: create } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', cryptoNetwork: '<String>' });
```

### CryptoAuthModule

```typescript
// List all cryptoAuthModules
const { data, isLoading } = useCryptoAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } },
});

// Get one cryptoAuthModule
const { data: item } = useCryptoAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } },
});

// Create a cryptoAuthModule
const { mutate: create } = useCreateCryptoAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', addressesTableId: '<UUID>', userField: '<String>', cryptoNetwork: '<String>', signInRequestChallenge: '<String>', signInRecordFailure: '<String>', signUpWithKey: '<String>', signInWithChallenge: '<String>' });
```

### DefaultIdsModule

```typescript
// List all defaultIdsModules
const { data, isLoading } = useDefaultIdsModulesQuery({
  selection: { fields: { id: true, databaseId: true } },
});

// Get one defaultIdsModule
const { data: item } = useDefaultIdsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true } },
});

// Create a defaultIdsModule
const { mutate: create } = useCreateDefaultIdsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>' });
```

### DenormalizedTableField

```typescript
// List all denormalizedTableFields
const { data, isLoading } = useDenormalizedTableFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } },
});

// Get one denormalizedTableField
const { data: item } = useDenormalizedTableFieldQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } },
});

// Create a denormalizedTableField
const { mutate: create } = useCreateDenormalizedTableFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', setIds: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', refIds: '<UUID>', useUpdates: '<Boolean>', updateDefaults: '<Boolean>', funcName: '<String>', funcOrder: '<Int>' });
```

### EmailsModule

```typescript
// List all emailsModules
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Get one emailsModule
const { data: item } = useEmailsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Create a emailsModule
const { mutate: create } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' });
```

### EncryptedSecretsModule

```typescript
// List all encryptedSecretsModules
const { data, isLoading } = useEncryptedSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one encryptedSecretsModule
const { data: item } = useEncryptedSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a encryptedSecretsModule
const { mutate: create } = useCreateEncryptedSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### InvitesModule

```typescript
// List all invitesModules
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } },
});

// Get one invitesModule
const { data: item } = useInvitesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } },
});

// Create a invitesModule
const { mutate: create } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', invitesTableId: '<UUID>', claimedInvitesTableId: '<UUID>', invitesTableName: '<String>', claimedInvitesTableName: '<String>', submitInviteCodeFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>' });
```

### LevelsModule

```typescript
// List all levelsModules
const { data, isLoading } = useLevelsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Get one levelsModule
const { data: item } = useLevelsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Create a levelsModule
const { mutate: create } = useCreateLevelsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', stepsTableId: '<UUID>', stepsTableName: '<String>', achievementsTableId: '<UUID>', achievementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', completedStep: '<String>', incompletedStep: '<String>', tgAchievement: '<String>', tgAchievementToggle: '<String>', tgAchievementToggleBoolean: '<String>', tgAchievementBoolean: '<String>', upsertAchievement: '<String>', tgUpdateAchievements: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' });
```

### LimitsModule

```typescript
// List all limitsModules
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Get one limitsModule
const { data: item } = useLimitsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Create a limitsModule
const { mutate: create } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' });
```

### MembershipTypesModule

```typescript
// List all membershipTypesModules
const { data, isLoading } = useMembershipTypesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one membershipTypesModule
const { data: item } = useMembershipTypesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a membershipTypesModule
const { mutate: create } = useCreateMembershipTypesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### MembershipsModule

```typescript
// List all membershipsModules
const { data, isLoading } = useMembershipsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true } },
});

// Get one membershipsModule
const { data: item } = useMembershipsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true } },
});

// Create a membershipsModule
const { mutate: create } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', actorTableId: '<UUID>', limitsTableId: '<UUID>', defaultLimitsTableId: '<UUID>', permissionsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', sprtTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', prefix: '<String>', actorMaskCheck: '<String>', actorPermCheck: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>' });
```

### PermissionsModule

```typescript
// List all permissionsModules
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } },
});

// Get one permissionsModule
const { data: item } = usePermissionsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } },
});

// Create a permissionsModule
const { mutate: create } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', prefix: '<String>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>' });
```

### PhoneNumbersModule

```typescript
// List all phoneNumbersModules
const { data, isLoading } = usePhoneNumbersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Get one phoneNumbersModule
const { data: item } = usePhoneNumbersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Create a phoneNumbersModule
const { mutate: create } = useCreatePhoneNumbersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' });
```

### ProfilesModule

```typescript
// List all profilesModules
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } },
});

// Get one profilesModule
const { data: item } = useProfilesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } },
});

// Create a profilesModule
const { mutate: create } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', prefix: '<String>' });
```

### SecretsModule

```typescript
// List all secretsModules
const { data, isLoading } = useSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one secretsModule
const { data: item } = useSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a secretsModule
const { mutate: create } = useCreateSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### SessionsModule

```typescript
// List all sessionsModules
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } },
});

// Get one sessionsModule
const { data: item } = useSessionsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } },
});

// Create a sessionsModule
const { mutate: create } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', authSettingsTableId: '<UUID>', usersTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionCredentialsTable: '<String>', authSettingsTable: '<String>' });
```

### UserAuthModule

```typescript
// List all userAuthModules
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true } },
});

// Get one userAuthModule
const { data: item } = useUserAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true } },
});

// Create a userAuthModule
const { mutate: create } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInOneTimeTokenFunction: '<String>', oneTimeTokenFunction: '<String>', extendTokenExpires: '<String>' });
```

### UsersModule

```typescript
// List all usersModules
const { data, isLoading } = useUsersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } },
});

// Get one usersModule
const { data: item } = useUsersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } },
});

// Create a usersModule
const { mutate: create } = useCreateUsersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' });
```

### Blueprint

```typescript
// List all blueprints
const { data, isLoading } = useBlueprintsQuery({
  selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } },
});

// Get one blueprint
const { data: item } = useBlueprintQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } },
});

// Create a blueprint
const { mutate: create } = useCreateBlueprintMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', databaseId: '<UUID>', name: '<String>', displayName: '<String>', description: '<String>', definition: '<JSON>', templateId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' });
```

### BlueprintTemplate

```typescript
// List all blueprintTemplates
const { data, isLoading } = useBlueprintTemplatesQuery({
  selection: { fields: { id: true, name: true, version: true, displayName: true, description: true, ownerId: true, visibility: true, categories: true, tags: true, definition: true, definitionSchemaVersion: true, source: true, complexity: true, copyCount: true, forkCount: true, forkedFromId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } },
});

// Get one blueprintTemplate
const { data: item } = useBlueprintTemplateQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, version: true, displayName: true, description: true, ownerId: true, visibility: true, categories: true, tags: true, definition: true, definitionSchemaVersion: true, source: true, complexity: true, copyCount: true, forkCount: true, forkedFromId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } },
});

// Create a blueprintTemplate
const { mutate: create } = useCreateBlueprintTemplateMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', version: '<String>', displayName: '<String>', description: '<String>', ownerId: '<UUID>', visibility: '<String>', categories: '<String>', tags: '<String>', definition: '<JSON>', definitionSchemaVersion: '<String>', source: '<String>', complexity: '<String>', copyCount: '<Int>', forkCount: '<Int>', forkedFromId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' });
```

### BlueprintConstruction

```typescript
// List all blueprintConstructions
const { data, isLoading } = useBlueprintConstructionsQuery({
  selection: { fields: { id: true, blueprintId: true, databaseId: true, schemaId: true, status: true, errorDetails: true, tableMap: true, constructedDefinition: true, constructedAt: true, createdAt: true, updatedAt: true } },
});

// Get one blueprintConstruction
const { data: item } = useBlueprintConstructionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, blueprintId: true, databaseId: true, schemaId: true, status: true, errorDetails: true, tableMap: true, constructedDefinition: true, constructedAt: true, createdAt: true, updatedAt: true } },
});

// Create a blueprintConstruction
const { mutate: create } = useCreateBlueprintConstructionMutation({
  selection: { fields: { id: true } },
});
create({ blueprintId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>', status: '<String>', errorDetails: '<String>', tableMap: '<JSON>', constructedDefinition: '<JSON>', constructedAt: '<Datetime>' });
```

### StorageModule

```typescript
// List all storageModules
const { data, isLoading } = useStorageModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, uploadRequestsTableId: true, bucketsTableName: true, filesTableName: true, uploadRequestsTableName: true, entityTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true } },
});

// Get one storageModule
const { data: item } = useStorageModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, uploadRequestsTableId: true, bucketsTableName: true, filesTableName: true, uploadRequestsTableName: true, entityTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true } },
});

// Create a storageModule
const { mutate: create } = useCreateStorageModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', uploadRequestsTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', uploadRequestsTableName: '<String>', entityTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>' });
```

### DatabaseProvisionModule

```typescript
// List all databaseProvisionModules
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } },
});

// Get one databaseProvisionModule
const { data: item } = useDatabaseProvisionModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } },
});

// Create a databaseProvisionModule
const { mutate: create } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseName: '<String>', ownerId: '<UUID>', subdomain: '<String>', domain: '<String>', modules: '<String>', options: '<JSON>', bootstrapUser: '<Boolean>', status: '<String>', errorMessage: '<String>', databaseId: '<UUID>', completedAt: '<Datetime>' });
```

### AppAdminGrant

```typescript
// List all appAdminGrants
const { data, isLoading } = useAppAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appAdminGrant
const { data: item } = useAppAdminGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appAdminGrant
const { mutate: create } = useCreateAppAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### AppOwnerGrant

```typescript
// List all appOwnerGrants
const { data, isLoading } = useAppOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appOwnerGrant
const { data: item } = useAppOwnerGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appOwnerGrant
const { mutate: create } = useCreateAppOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### AppGrant

```typescript
// List all appGrants
const { data, isLoading } = useAppGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appGrant
const { data: item } = useAppGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appGrant
const { mutate: create } = useCreateAppGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### OrgMembership

```typescript
// List all orgMemberships
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } },
});

// Get one orgMembership
const { data: item } = useOrgMembershipQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } },
});

// Create a orgMembership
const { mutate: create } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', profileId: '<UUID>' });
```

### OrgMember

```typescript
// List all orgMembers
const { data, isLoading } = useOrgMembersQuery({
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Get one orgMember
const { data: item } = useOrgMemberQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Create a orgMember
const { mutate: create } = useCreateOrgMemberMutation({
  selection: { fields: { id: true } },
});
create({ isAdmin: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>' });
```

### OrgAdminGrant

```typescript
// List all orgAdminGrants
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgAdminGrant
const { data: item } = useOrgAdminGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgAdminGrant
const { mutate: create } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgOwnerGrant

```typescript
// List all orgOwnerGrants
const { data, isLoading } = useOrgOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgOwnerGrant
const { data: item } = useOrgOwnerGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgOwnerGrant
const { mutate: create } = useCreateOrgOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgGrant

```typescript
// List all orgGrants
const { data, isLoading } = useOrgGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgGrant
const { data: item } = useOrgGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgGrant
const { mutate: create } = useCreateOrgGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgChartEdge

```typescript
// List all orgChartEdges
const { data, isLoading } = useOrgChartEdgesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } },
});

// Get one orgChartEdge
const { data: item } = useOrgChartEdgeQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } },
});

// Create a orgChartEdge
const { mutate: create } = useCreateOrgChartEdgeMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', positionTitle: '<String>', positionLevel: '<Int>' });
```

### OrgChartEdgeGrant

```typescript
// List all orgChartEdgeGrants
const { data, isLoading } = useOrgChartEdgeGrantsQuery({
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } },
});

// Get one orgChartEdgeGrant
const { data: item } = useOrgChartEdgeGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } },
});

// Create a orgChartEdgeGrant
const { mutate: create } = useCreateOrgChartEdgeGrantMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', positionTitle: '<String>', positionLevel: '<Int>' });
```

### OrgPermissionDefault

```typescript
// List all orgPermissionDefaults
const { data, isLoading } = useOrgPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Get one orgPermissionDefault
const { data: item } = useOrgPermissionDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Create a orgPermissionDefault
const { mutate: create } = useCreateOrgPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', entityId: '<UUID>' });
```

### AppLimit

```typescript
// List all appLimits
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});

// Get one appLimit
const { data: item } = useAppLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});

// Create a appLimit
const { mutate: create } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>' });
```

### OrgLimit

```typescript
// List all orgLimits
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } },
});

// Get one orgLimit
const { data: item } = useOrgLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } },
});

// Create a orgLimit
const { mutate: create } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>', entityId: '<UUID>' });
```

### AppStep

```typescript
// List all appSteps
const { data, isLoading } = useAppStepsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appStep
const { data: item } = useAppStepQuery({
  id: '<UUID>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appStep
const { mutate: create } = useCreateAppStepMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', name: '<String>', count: '<Int>' });
```

### AppAchievement

```typescript
// List all appAchievements
const { data, isLoading } = useAppAchievementsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appAchievement
const { data: item } = useAppAchievementQuery({
  id: '<UUID>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appAchievement
const { mutate: create } = useCreateAppAchievementMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', name: '<String>', count: '<Int>' });
```

### AppLevel

```typescript
// List all appLevels
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Get one appLevel
const { data: item } = useAppLevelQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Create a appLevel
const { mutate: create } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', image: '<Image>', ownerId: '<UUID>' });
```

### Email

```typescript
// List all emails
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Get one email
const { data: item } = useEmailQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Create a email
const { mutate: create } = useCreateEmailMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', email: '<Email>', isVerified: '<Boolean>', isPrimary: '<Boolean>' });
```

### PhoneNumber

```typescript
// List all phoneNumbers
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Get one phoneNumber
const { data: item } = usePhoneNumberQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Create a phoneNumber
const { mutate: create } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', cc: '<String>', number: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>' });
```

### CryptoAddress

```typescript
// List all cryptoAddresses
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Get one cryptoAddress
const { data: item } = useCryptoAddressQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Create a cryptoAddress
const { mutate: create } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', address: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>' });
```

### ConnectedAccount

```typescript
// List all connectedAccounts
const { data, isLoading } = useConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Get one connectedAccount
const { data: item } = useConnectedAccountQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Create a connectedAccount
const { mutate: create } = useCreateConnectedAccountMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' });
```

### Invite

```typescript
// List all invites
const { data, isLoading } = useInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Get one invite
const { data: item } = useInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Create a invite
const { mutate: create } = useCreateInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' });
```

### ClaimedInvite

```typescript
// List all claimedInvites
const { data, isLoading } = useClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Get one claimedInvite
const { data: item } = useClaimedInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Create a claimedInvite
const { mutate: create } = useCreateClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' });
```

### OrgInvite

```typescript
// List all orgInvites
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgInvite
const { data: item } = useOrgInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgInvite
const { mutate: create } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<Email>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>', entityId: '<UUID>' });
```

### OrgClaimedInvite

```typescript
// List all orgClaimedInvites
const { data, isLoading } = useOrgClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgClaimedInvite
const { data: item } = useOrgClaimedInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgClaimedInvite
const { mutate: create } = useCreateOrgClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>', entityId: '<UUID>' });
```

### AuditLog

```typescript
// List all auditLogs
const { data, isLoading } = useAuditLogsQuery({
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } },
});

// Get one auditLog
const { data: item } = useAuditLogQuery({
  id: '<UUID>',
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } },
});

// Create a auditLog
const { mutate: create } = useCreateAuditLogMutation({
  selection: { fields: { id: true } },
});
create({ event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' });
```

### Ref

```typescript
// List all refs
const { data, isLoading } = useRefsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Get one ref
const { data: item } = useRefQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Create a ref
const { mutate: create } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```

### Store

```typescript
// List all stores
const { data, isLoading } = useStoresQuery({
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Get one store
const { data: item } = useStoreQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Create a store
const { mutate: create } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', databaseId: '<UUID>', hash: '<UUID>' });
```

### AppPermissionDefault

```typescript
// List all appPermissionDefaults
const { data, isLoading } = useAppPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true } },
});

// Get one appPermissionDefault
const { data: item } = useAppPermissionDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true } },
});

// Create a appPermissionDefault
const { mutate: create } = useCreateAppPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>' });
```

### RoleType

```typescript
// List all roleTypes
const { data, isLoading } = useRoleTypesQuery({
  selection: { fields: { id: true, name: true } },
});

// Get one roleType
const { data: item } = useRoleTypeQuery({
  id: '<Int>',
  selection: { fields: { id: true, name: true } },
});

// Create a roleType
const { mutate: create } = useCreateRoleTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>' });
```

### AppLimitDefault

```typescript
// List all appLimitDefaults
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one appLimitDefault
const { data: item } = useAppLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a appLimitDefault
const { mutate: create } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<Int>' });
```

### OrgLimitDefault

```typescript
// List all orgLimitDefaults
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one orgLimitDefault
const { data: item } = useOrgLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a orgLimitDefault
const { mutate: create } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<Int>' });
```

### MigrateFile

```typescript
// List all migrateFiles
const { data, isLoading } = useMigrateFilesQuery({
  selection: { fields: { id: true, databaseId: true, upload: true } },
});

// Get one migrateFile
const { data: item } = useMigrateFileQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, upload: true } },
});

// Create a migrateFile
const { mutate: create } = useCreateMigrateFileMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', upload: '<Upload>' });
```

### MembershipType

```typescript
// List all membershipTypes
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true } },
});

// Get one membershipType
const { data: item } = useMembershipTypeQuery({
  id: '<Int>',
  selection: { fields: { id: true, name: true, description: true, prefix: true } },
});

// Create a membershipType
const { mutate: create } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', prefix: '<String>' });
```

### Commit

```typescript
// List all commits
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one commit
const { data: item } = useCommitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a commit
const { mutate: create } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<String>', databaseId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```

### AppMembershipDefault

```typescript
// List all appMembershipDefaults
const { data, isLoading } = useAppMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Get one appMembershipDefault
const { data: item } = useAppMembershipDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Create a appMembershipDefault
const { mutate: create } = useCreateAppMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' });
```

### RlsModule

```typescript
// List all rlsModules
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } },
});

// Get one rlsModule
const { data: item } = useRlsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } },
});

// Create a rlsModule
const { mutate: create } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>' });
```

### NodeTypeRegistry

```typescript
// List all nodeTypeRegistries
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, summary: true, parameterSchema: true, guidance: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one nodeTypeRegistry
const { data: item } = useNodeTypeRegistryQuery({
  name: '<String>',
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, summary: true, parameterSchema: true, guidance: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a nodeTypeRegistry
const { mutate: create } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
create({ slug: '<String>', category: '<String>', displayName: '<String>', description: '<String>', summary: '<String>', parameterSchema: '<JSON>', guidance: '<JSON>', tags: '<String>' });
```

### OrgMembershipDefault

```typescript
// List all orgMembershipDefaults
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } },
});

// Get one orgMembershipDefault
const { data: item } = useOrgMembershipDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } },
});

// Create a orgMembershipDefault
const { mutate: create } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>', deleteMemberCascadeGroups: '<Boolean>', createGroupsCascadeMembers: '<Boolean>' });
```

### SqlAction

```typescript
// List all sqlActions
const { data, isLoading } = useSqlActionsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Get one sqlAction
const { data: item } = useSqlActionQuery({
  id: '<Int>',
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Create a sqlAction
const { mutate: create } = useCreateSqlActionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', payload: '<JSON>', content: '<String>', revert: '<String>', verify: '<String>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' });
```

### User

```typescript
// List all users
const { data, isLoading } = useUsersQuery({
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Get one user
const { data: item } = useUserQuery({
  id: '<UUID>',
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Create a user
const { mutate: create } = useCreateUserMutation({
  selection: { fields: { id: true } },
});
create({ username: '<String>', displayName: '<String>', profilePicture: '<Image>', searchTsv: '<FullText>', type: '<Int>', searchTsvRank: '<Float>', displayNameTrgmSimilarity: '<Float>', searchScore: '<Float>' });
```

### AstMigration

```typescript
// List all astMigrations
const { data, isLoading } = useAstMigrationsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Get one astMigration
const { data: item } = useAstMigrationQuery({
  id: '<Int>',
  selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Create a astMigration
const { mutate: create } = useCreateAstMigrationMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', requires: '<String>', payload: '<JSON>', deploys: '<String>', deploy: '<JSON>', revert: '<JSON>', verify: '<JSON>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' });
```

### AppMembership

```typescript
// List all appMemberships
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Get one appMembership
const { data: item } = useAppMembershipQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Create a appMembership
const { mutate: create } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' });
```

### HierarchyModule

```typescript
// List all hierarchyModules
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } },
});

// Get one hierarchyModule
const { data: item } = useHierarchyModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } },
});

// Create a hierarchyModule
const { mutate: create } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', entityTableId: '<UUID>', usersTableId: '<UUID>', prefix: '<String>', privateSchemaName: '<String>', sprtTableName: '<String>', rebuildHierarchyFunction: '<String>', getSubordinatesFunction: '<String>', getManagersFunction: '<String>', isManagerOfFunction: '<String>' });
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

### `useResolveBlueprintTableQuery`

Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `tableName` | String |
  | `schemaName` | String |
  | `tableMap` | JSON |
  | `defaultSchemaId` | UUID |

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

### `useSendAccountDeletionEmailMutation`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendAccountDeletionEmailInput (required) |

### `useSignOutMutation`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignOutInput (required) |

### `useAcceptDatabaseTransferMutation`

acceptDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AcceptDatabaseTransferInput (required) |

### `useCancelDatabaseTransferMutation`

cancelDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CancelDatabaseTransferInput (required) |

### `useRejectDatabaseTransferMutation`

rejectDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RejectDatabaseTransferInput (required) |

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

### `useCheckPasswordMutation`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CheckPasswordInput (required) |

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

### `useConstructBlueprintMutation`

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Five phases: (1) provision_table() for each table with all nodes[], fields[], policies[], grants, and table-level indexes/fts/unique_constraints in a single call, (2) provision_relation() for each relation, (3) provision_index() for top-level indexes, (4) provision_full_text_search() for top-level FTS, (5) provision_unique_constraint() for top-level unique constraints. Tables are identified by table_name with optional per-table schema_name. Relations use $type for relation_type with source_table/target_table. Returns the construction record ID on success, NULL on failure.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConstructBlueprintInput (required) |

### `useResetPasswordMutation`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

### `useRemoveNodeAtPathMutation`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RemoveNodeAtPathInput (required) |

### `useCopyTemplateToBlueprintMutation`

Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyTemplateToBlueprintInput (required) |

### `useBootstrapUserMutation`

bootstrapUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | BootstrapUserInput (required) |

### `useSetFieldOrderMutation`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetFieldOrderInput (required) |

### `useProvisionUniqueConstraintMutation`

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionUniqueConstraintInput (required) |

### `useProvisionFullTextSearchMutation`

Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionFullTextSearchInput (required) |

### `useProvisionIndexMutation`

Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionIndexInput (required) |

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

### `useProvisionRelationMutation`

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionRelationInput (required) |

### `useApplyRlsMutation`

applyRls

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ApplyRlsInput (required) |

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

### `useOneTimeTokenMutation`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OneTimeTokenInput (required) |

### `useProvisionTableMutation`

Composable table provisioning: creates or finds a table, then applies N nodes (Data* modules), creates fields, enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionTableInput (required) |

### `useSendVerificationEmailMutation`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendVerificationEmailInput (required) |

### `useForgotPasswordMutation`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ForgotPasswordInput (required) |

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
