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
| `useSpatialRelationsQuery` | Query | List all spatialRelations |
| `useSpatialRelationQuery` | Query | Get one spatialRelation |
| `useCreateSpatialRelationMutation` | Mutation | Create a spatialRelation |
| `useUpdateSpatialRelationMutation` | Mutation | Update a spatialRelation |
| `useDeleteSpatialRelationMutation` | Mutation | Delete a spatialRelation |
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
| `useSecureTableProvisionsQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useSecureTableProvisionQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useCreateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useUpdateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useDeleteSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
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
| `useSessionSecretsModulesQuery` | Query | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useSessionSecretsModuleQuery` | Query | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useCreateSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useUpdateSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useDeleteSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useIdentityProvidersModulesQuery` | Query | Config row for the identity_providers_module, which provisions a per-database identity_providers config table holding OAuth2 / OIDC (and future SAML) provider definitions: protocol kind, endpoint URLs, encrypted client secret, scopes, audience validation, PKCE, and email-handling flags. Built-in providers (google, github, apple, ...) are seeded as is_built_in=true rows; custom providers use slugs of the form custom:<slug>. |
| `useIdentityProvidersModuleQuery` | Query | Config row for the identity_providers_module, which provisions a per-database identity_providers config table holding OAuth2 / OIDC (and future SAML) provider definitions: protocol kind, endpoint URLs, encrypted client secret, scopes, audience validation, PKCE, and email-handling flags. Built-in providers (google, github, apple, ...) are seeded as is_built_in=true rows; custom providers use slugs of the form custom:<slug>. |
| `useCreateIdentityProvidersModuleMutation` | Mutation | Config row for the identity_providers_module, which provisions a per-database identity_providers config table holding OAuth2 / OIDC (and future SAML) provider definitions: protocol kind, endpoint URLs, encrypted client secret, scopes, audience validation, PKCE, and email-handling flags. Built-in providers (google, github, apple, ...) are seeded as is_built_in=true rows; custom providers use slugs of the form custom:<slug>. |
| `useUpdateIdentityProvidersModuleMutation` | Mutation | Config row for the identity_providers_module, which provisions a per-database identity_providers config table holding OAuth2 / OIDC (and future SAML) provider definitions: protocol kind, endpoint URLs, encrypted client secret, scopes, audience validation, PKCE, and email-handling flags. Built-in providers (google, github, apple, ...) are seeded as is_built_in=true rows; custom providers use slugs of the form custom:<slug>. |
| `useDeleteIdentityProvidersModuleMutation` | Mutation | Config row for the identity_providers_module, which provisions a per-database identity_providers config table holding OAuth2 / OIDC (and future SAML) provider definitions: protocol kind, endpoint URLs, encrypted client secret, scopes, audience validation, PKCE, and email-handling flags. Built-in providers (google, github, apple, ...) are seeded as is_built_in=true rows; custom providers use slugs of the form custom:<slug>. |
| `useRealtimeModulesQuery` | Query | List all realtimeModules |
| `useRealtimeModuleQuery` | Query | Get one realtimeModule |
| `useCreateRealtimeModuleMutation` | Mutation | Create a realtimeModule |
| `useUpdateRealtimeModuleMutation` | Mutation | Update a realtimeModule |
| `useDeleteRealtimeModuleMutation` | Mutation | Delete a realtimeModule |
| `useConfigSecretsOrgModulesQuery` | Query | Config row for the config_secrets_org_module, which provisions an organization-scoped encrypted key-value secrets store with manage_secrets permission and entity-membership RLS. |
| `useConfigSecretsOrgModuleQuery` | Query | Config row for the config_secrets_org_module, which provisions an organization-scoped encrypted key-value secrets store with manage_secrets permission and entity-membership RLS. |
| `useCreateConfigSecretsOrgModuleMutation` | Mutation | Config row for the config_secrets_org_module, which provisions an organization-scoped encrypted key-value secrets store with manage_secrets permission and entity-membership RLS. |
| `useUpdateConfigSecretsOrgModuleMutation` | Mutation | Config row for the config_secrets_org_module, which provisions an organization-scoped encrypted key-value secrets store with manage_secrets permission and entity-membership RLS. |
| `useDeleteConfigSecretsOrgModuleMutation` | Mutation | Config row for the config_secrets_org_module, which provisions an organization-scoped encrypted key-value secrets store with manage_secrets permission and entity-membership RLS. |
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
| `useFunctionsQuery` | Query | List all functions |
| `useFunctionQuery` | Query | Get one function |
| `useCreateFunctionMutation` | Mutation | Create a function |
| `useUpdateFunctionMutation` | Mutation | Update a function |
| `useDeleteFunctionMutation` | Mutation | Delete a function |
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
| `useCorsSettingsQuery` | Query | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useCorsSettingQuery` | Query | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useCreateCorsSettingMutation` | Mutation | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useUpdateCorsSettingMutation` | Mutation | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useDeleteCorsSettingMutation` | Mutation | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
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
| `usePartitionsQuery` | Query | List all partitions |
| `usePartitionQuery` | Query | Get one partition |
| `useCreatePartitionMutation` | Mutation | Create a partition |
| `useUpdatePartitionMutation` | Mutation | Update a partition |
| `useDeletePartitionMutation` | Mutation | Delete a partition |
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
| `useApiSettingsQuery` | Query | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useApiSettingQuery` | Query | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useCreateApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useUpdateApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useDeleteApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
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
| `useConfigSecretsUserModulesQuery` | Query | List all configSecretsUserModules |
| `useConfigSecretsUserModuleQuery` | Query | Get one configSecretsUserModule |
| `useCreateConfigSecretsUserModuleMutation` | Mutation | Create a configSecretsUserModule |
| `useUpdateConfigSecretsUserModuleMutation` | Mutation | Update a configSecretsUserModule |
| `useDeleteConfigSecretsUserModuleMutation` | Mutation | Delete a configSecretsUserModule |
| `useInvitesModulesQuery` | Query | List all invitesModules |
| `useInvitesModuleQuery` | Query | Get one invitesModule |
| `useCreateInvitesModuleMutation` | Mutation | Create a invitesModule |
| `useUpdateInvitesModuleMutation` | Mutation | Update a invitesModule |
| `useDeleteInvitesModuleMutation` | Mutation | Delete a invitesModule |
| `useEventsModulesQuery` | Query | List all eventsModules |
| `useEventsModuleQuery` | Query | Get one eventsModule |
| `useCreateEventsModuleMutation` | Mutation | Create a eventsModule |
| `useUpdateEventsModuleMutation` | Mutation | Update a eventsModule |
| `useDeleteEventsModuleMutation` | Mutation | Delete a eventsModule |
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
| `useUserStateModulesQuery` | Query | List all userStateModules |
| `useUserStateModuleQuery` | Query | Get one userStateModule |
| `useCreateUserStateModuleMutation` | Mutation | Create a userStateModule |
| `useUpdateUserStateModuleMutation` | Mutation | Update a userStateModule |
| `useDeleteUserStateModuleMutation` | Mutation | Delete a userStateModule |
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
| `useEntityTypeProvisionsQuery` | Query | Provisions a new membership entity type. Each INSERT creates an entity table, registers a membership type,
     and installs the required modules (permissions, memberships, limits) plus optional modules (profiles, levels, invites).
     Uses provision_membership_table() internally. Graceful: duplicate (database_id, prefix) pairs are silently skipped
     via the unique constraint (use INSERT ... ON CONFLICT DO NOTHING).
     Policy behavior: by default the five entity-table RLS policies are applied (gated by is_visible).
     Set table_provision to a single jsonb object (using the same shape as provision_table() /
     blueprint tables[] entries) to replace the defaults with your own; set skip_entity_policies=true
     as an escape hatch to apply zero policies. |
| `useEntityTypeProvisionQuery` | Query | Provisions a new membership entity type. Each INSERT creates an entity table, registers a membership type,
     and installs the required modules (permissions, memberships, limits) plus optional modules (profiles, levels, invites).
     Uses provision_membership_table() internally. Graceful: duplicate (database_id, prefix) pairs are silently skipped
     via the unique constraint (use INSERT ... ON CONFLICT DO NOTHING).
     Policy behavior: by default the five entity-table RLS policies are applied (gated by is_visible).
     Set table_provision to a single jsonb object (using the same shape as provision_table() /
     blueprint tables[] entries) to replace the defaults with your own; set skip_entity_policies=true
     as an escape hatch to apply zero policies. |
| `useCreateEntityTypeProvisionMutation` | Mutation | Provisions a new membership entity type. Each INSERT creates an entity table, registers a membership type,
     and installs the required modules (permissions, memberships, limits) plus optional modules (profiles, levels, invites).
     Uses provision_membership_table() internally. Graceful: duplicate (database_id, prefix) pairs are silently skipped
     via the unique constraint (use INSERT ... ON CONFLICT DO NOTHING).
     Policy behavior: by default the five entity-table RLS policies are applied (gated by is_visible).
     Set table_provision to a single jsonb object (using the same shape as provision_table() /
     blueprint tables[] entries) to replace the defaults with your own; set skip_entity_policies=true
     as an escape hatch to apply zero policies. |
| `useUpdateEntityTypeProvisionMutation` | Mutation | Provisions a new membership entity type. Each INSERT creates an entity table, registers a membership type,
     and installs the required modules (permissions, memberships, limits) plus optional modules (profiles, levels, invites).
     Uses provision_membership_table() internally. Graceful: duplicate (database_id, prefix) pairs are silently skipped
     via the unique constraint (use INSERT ... ON CONFLICT DO NOTHING).
     Policy behavior: by default the five entity-table RLS policies are applied (gated by is_visible).
     Set table_provision to a single jsonb object (using the same shape as provision_table() /
     blueprint tables[] entries) to replace the defaults with your own; set skip_entity_policies=true
     as an escape hatch to apply zero policies. |
| `useDeleteEntityTypeProvisionMutation` | Mutation | Provisions a new membership entity type. Each INSERT creates an entity table, registers a membership type,
     and installs the required modules (permissions, memberships, limits) plus optional modules (profiles, levels, invites).
     Uses provision_membership_table() internally. Graceful: duplicate (database_id, prefix) pairs are silently skipped
     via the unique constraint (use INSERT ... ON CONFLICT DO NOTHING).
     Policy behavior: by default the five entity-table RLS policies are applied (gated by is_visible).
     Set table_provision to a single jsonb object (using the same shape as provision_table() /
     blueprint tables[] entries) to replace the defaults with your own; set skip_entity_policies=true
     as an escape hatch to apply zero policies. |
| `useWebauthnCredentialsModulesQuery` | Query | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useWebauthnCredentialsModuleQuery` | Query | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useCreateWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useUpdateWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useDeleteWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useWebauthnAuthModulesQuery` | Query | List all webauthnAuthModules |
| `useWebauthnAuthModuleQuery` | Query | Get one webauthnAuthModule |
| `useCreateWebauthnAuthModuleMutation` | Mutation | Create a webauthnAuthModule |
| `useUpdateWebauthnAuthModuleMutation` | Mutation | Update a webauthnAuthModule |
| `useDeleteWebauthnAuthModuleMutation` | Mutation | Delete a webauthnAuthModule |
| `useNotificationsModulesQuery` | Query | List all notificationsModules |
| `useNotificationsModuleQuery` | Query | Get one notificationsModule |
| `useCreateNotificationsModuleMutation` | Mutation | Create a notificationsModule |
| `useUpdateNotificationsModuleMutation` | Mutation | Update a notificationsModule |
| `useDeleteNotificationsModuleMutation` | Mutation | Delete a notificationsModule |
| `useInferenceLogModulesQuery` | Query | List all inferenceLogModules |
| `useInferenceLogModuleQuery` | Query | Get one inferenceLogModule |
| `useCreateInferenceLogModuleMutation` | Mutation | Create a inferenceLogModule |
| `useUpdateInferenceLogModuleMutation` | Mutation | Update a inferenceLogModule |
| `useDeleteInferenceLogModuleMutation` | Mutation | Delete a inferenceLogModule |
| `useComputeLogModulesQuery` | Query | List all computeLogModules |
| `useComputeLogModuleQuery` | Query | Get one computeLogModule |
| `useCreateComputeLogModuleMutation` | Mutation | Create a computeLogModule |
| `useUpdateComputeLogModuleMutation` | Mutation | Update a computeLogModule |
| `useDeleteComputeLogModuleMutation` | Mutation | Delete a computeLogModule |
| `useTransferLogModulesQuery` | Query | List all transferLogModules |
| `useTransferLogModuleQuery` | Query | Get one transferLogModule |
| `useCreateTransferLogModuleMutation` | Mutation | Create a transferLogModule |
| `useUpdateTransferLogModuleMutation` | Mutation | Update a transferLogModule |
| `useDeleteTransferLogModuleMutation` | Mutation | Delete a transferLogModule |
| `useStorageLogModulesQuery` | Query | List all storageLogModules |
| `useStorageLogModuleQuery` | Query | Get one storageLogModule |
| `useCreateStorageLogModuleMutation` | Mutation | Create a storageLogModule |
| `useUpdateStorageLogModuleMutation` | Mutation | Update a storageLogModule |
| `useDeleteStorageLogModuleMutation` | Mutation | Delete a storageLogModule |
| `useDbUsageModulesQuery` | Query | List all dbUsageModules |
| `useDbUsageModuleQuery` | Query | Get one dbUsageModule |
| `useCreateDbUsageModuleMutation` | Mutation | Create a dbUsageModule |
| `useUpdateDbUsageModuleMutation` | Mutation | Update a dbUsageModule |
| `useDeleteDbUsageModuleMutation` | Mutation | Delete a dbUsageModule |
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
| `useOrgMemberProfilesQuery` | Query | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useOrgMemberProfileQuery` | Query | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useCreateOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useUpdateOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useDeleteOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
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
| `useAppLimitCreditsQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useAppLimitCreditQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useCreateAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useUpdateAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useDeleteAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useAppLimitCreditCodeItemsQuery` | Query | Items within a credit code — each row grants credits for a specific limit definition |
| `useAppLimitCreditCodeItemQuery` | Query | Items within a credit code — each row grants credits for a specific limit definition |
| `useCreateAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useUpdateAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useDeleteAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useAppLimitCreditRedemptionsQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useAppLimitCreditRedemptionQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useCreateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useUpdateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useDeleteAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useOrgLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitCreditsQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useOrgLimitCreditQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useCreateOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useUpdateOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useDeleteOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useOrgLimitAggregatesQuery` | Query | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useOrgLimitAggregateQuery` | Query | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useCreateOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useUpdateOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useDeleteOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useOrgLimitWarningsQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useOrgLimitWarningQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useCreateOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useUpdateOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useDeleteOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
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
| `useWebauthnCredentialsQuery` | Query | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useWebauthnCredentialQuery` | Query | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useCreateWebauthnCredentialMutation` | Mutation | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useUpdateWebauthnCredentialMutation` | Mutation | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useDeleteWebauthnCredentialMutation` | Mutation | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useAppInvitesQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useAppInviteQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useCreateAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useUpdateAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useDeleteAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useAppClaimedInvitesQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useAppClaimedInviteQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useCreateAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useUpdateAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useDeleteAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
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
| `useAuditLogAuthsQuery` | Query | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useAuditLogAuthQuery` | Query | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useCreateAuditLogAuthMutation` | Mutation | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useUpdateAuditLogAuthMutation` | Mutation | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useDeleteAuditLogAuthMutation` | Mutation | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useIdentityProvidersQuery` | Query | List all identityProviders |
| `useCreateIdentityProviderMutation` | Mutation | Create a identityProvider |
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
| `useMigrateFilesQuery` | Query | List all migrateFiles |
| `useMigrateFileQuery` | Query | Get one migrateFile |
| `useCreateMigrateFileMutation` | Mutation | Create a migrateFile |
| `useUpdateMigrateFileMutation` | Mutation | Update a migrateFile |
| `useDeleteMigrateFileMutation` | Mutation | Delete a migrateFile |
| `useDevicesModulesQuery` | Query | List all devicesModules |
| `useDevicesModuleQuery` | Query | Get one devicesModule |
| `useCreateDevicesModuleMutation` | Mutation | Create a devicesModule |
| `useUpdateDevicesModuleMutation` | Mutation | Update a devicesModule |
| `useDeleteDevicesModuleMutation` | Mutation | Delete a devicesModule |
| `useAppMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useAppMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useNodeTypeRegistriesQuery` | Query | List all nodeTypeRegistries |
| `useNodeTypeRegistryQuery` | Query | Get one nodeTypeRegistry |
| `useCreateNodeTypeRegistryMutation` | Mutation | Create a nodeTypeRegistry |
| `useUpdateNodeTypeRegistryMutation` | Mutation | Update a nodeTypeRegistry |
| `useDeleteNodeTypeRegistryMutation` | Mutation | Delete a nodeTypeRegistry |
| `useAppLimitCapsDefaultsQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useAppLimitCapsDefaultQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useCreateAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useUpdateAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useDeleteAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useOrgLimitCapsDefaultsQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useOrgLimitCapsDefaultQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useCreateOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useUpdateOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useDeleteOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useAppLimitCapsQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useAppLimitCapQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useCreateAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useUpdateAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useDeleteAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useOrgLimitCapsQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useOrgLimitCapQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useCreateOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useUpdateOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useDeleteOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useUserConnectedAccountsQuery` | Query | List all userConnectedAccounts |
| `useUserConnectedAccountQuery` | Query | Get one userConnectedAccount |
| `useCreateUserConnectedAccountMutation` | Mutation | Create a userConnectedAccount |
| `useUpdateUserConnectedAccountMutation` | Mutation | Update a userConnectedAccount |
| `useDeleteUserConnectedAccountMutation` | Mutation | Delete a userConnectedAccount |
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
| `useAppLimitCreditCodesQuery` | Query | Redeemable credit codes managed by admins with the add_credits permission |
| `useAppLimitCreditCodeQuery` | Query | Redeemable credit codes managed by admins with the add_credits permission |
| `useCreateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useUpdateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useDeleteAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useAppLimitWarningsQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useAppLimitWarningQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useCreateAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useUpdateAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useDeleteAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useCommitsQuery` | Query | A commit records changes to the repository. |
| `useCommitQuery` | Query | A commit records changes to the repository. |
| `useCreateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useUpdateCommitMutation` | Mutation | A commit records changes to the repository. |
| `useDeleteCommitMutation` | Mutation | A commit records changes to the repository. |
| `usePubkeySettingsQuery` | Query | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `usePubkeySettingQuery` | Query | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useCreatePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useUpdatePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useDeletePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useRateLimitsModulesQuery` | Query | List all rateLimitsModules |
| `useRateLimitsModuleQuery` | Query | Get one rateLimitsModule |
| `useCreateRateLimitsModuleMutation` | Mutation | Create a rateLimitsModule |
| `useUpdateRateLimitsModuleMutation` | Mutation | Update a rateLimitsModule |
| `useDeleteRateLimitsModuleMutation` | Mutation | Delete a rateLimitsModule |
| `useMembershipTypesQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useMembershipTypeQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useCreateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useUpdateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useDeleteMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useRlsSettingsQuery` | Query | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useRlsSettingQuery` | Query | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useCreateRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useUpdateRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useDeleteRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useRlsModulesQuery` | Query | List all rlsModules |
| `useRlsModuleQuery` | Query | Get one rlsModule |
| `useCreateRlsModuleMutation` | Mutation | Create a rlsModule |
| `useUpdateRlsModuleMutation` | Mutation | Update a rlsModule |
| `useDeleteRlsModuleMutation` | Mutation | Delete a rlsModule |
| `useAgentChatModulesQuery` | Query | List all agentChatModules |
| `useAgentChatModuleQuery` | Query | Get one agentChatModule |
| `useCreateAgentChatModuleMutation` | Mutation | Create a agentChatModule |
| `useUpdateAgentChatModuleMutation` | Mutation | Update a agentChatModule |
| `useDeleteAgentChatModuleMutation` | Mutation | Delete a agentChatModule |
| `useRateLimitMetersModulesQuery` | Query | List all rateLimitMetersModules |
| `useRateLimitMetersModuleQuery` | Query | Get one rateLimitMetersModule |
| `useCreateRateLimitMetersModuleMutation` | Mutation | Create a rateLimitMetersModule |
| `useUpdateRateLimitMetersModuleMutation` | Mutation | Update a rateLimitMetersModule |
| `useDeleteRateLimitMetersModuleMutation` | Mutation | Delete a rateLimitMetersModule |
| `usePlansModulesQuery` | Query | List all plansModules |
| `usePlansModuleQuery` | Query | Get one plansModule |
| `useCreatePlansModuleMutation` | Mutation | Create a plansModule |
| `useUpdatePlansModuleMutation` | Mutation | Update a plansModule |
| `useDeletePlansModuleMutation` | Mutation | Delete a plansModule |
| `useSqlActionsQuery` | Query | List all sqlActions |
| `useSqlActionQuery` | Query | Get one sqlAction |
| `useCreateSqlActionMutation` | Mutation | Create a sqlAction |
| `useUpdateSqlActionMutation` | Mutation | Update a sqlAction |
| `useDeleteSqlActionMutation` | Mutation | Delete a sqlAction |
| `useAppLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useAppLimitEventQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useUpdateAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useDeleteAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useOrgLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useOrgLimitEventQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useUpdateOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useDeleteOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useDatabaseSettingsQuery` | Query | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useDatabaseSettingQuery` | Query | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useCreateDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useUpdateDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useDeleteDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useOrgMembershipSettingsQuery` | Query | Per-entity settings for the memberships module |
| `useOrgMembershipSettingQuery` | Query | Per-entity settings for the memberships module |
| `useCreateOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
| `useUpdateOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
| `useDeleteOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
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
| `useAstMigrationsQuery` | Query | List all astMigrations |
| `useAstMigrationQuery` | Query | Get one astMigration |
| `useCreateAstMigrationMutation` | Mutation | Create a astMigration |
| `useUpdateAstMigrationMutation` | Mutation | Update a astMigration |
| `useDeleteAstMigrationMutation` | Mutation | Delete a astMigration |
| `useWebauthnSettingsQuery` | Query | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useWebauthnSettingQuery` | Query | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useCreateWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useUpdateWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useDeleteWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useBillingModulesQuery` | Query | List all billingModules |
| `useBillingModuleQuery` | Query | Get one billingModule |
| `useCreateBillingModuleMutation` | Mutation | Create a billingModule |
| `useUpdateBillingModuleMutation` | Mutation | Update a billingModule |
| `useDeleteBillingModuleMutation` | Mutation | Delete a billingModule |
| `useBillingProviderModulesQuery` | Query | List all billingProviderModules |
| `useBillingProviderModuleQuery` | Query | Get one billingProviderModule |
| `useCreateBillingProviderModuleMutation` | Mutation | Create a billingProviderModule |
| `useUpdateBillingProviderModuleMutation` | Mutation | Update a billingProviderModule |
| `useDeleteBillingProviderModuleMutation` | Mutation | Delete a billingProviderModule |
| `useHierarchyModulesQuery` | Query | List all hierarchyModules |
| `useHierarchyModuleQuery` | Query | Get one hierarchyModule |
| `useCreateHierarchyModuleMutation` | Mutation | Create a hierarchyModule |
| `useUpdateHierarchyModuleMutation` | Mutation | Update a hierarchyModule |
| `useDeleteHierarchyModuleMutation` | Mutation | Delete a hierarchyModule |
| `useCurrentUserIdQuery` | Query | currentUserId |
| `useCurrentUserAgentQuery` | Query | currentUserAgent |
| `useCurrentIpAddressQuery` | Query | currentIpAddress |
| `useRequireStepUpQuery` | Query | requireStepUp |
| `useAppPermissionsGetPaddedMaskQuery` | Query | appPermissionsGetPaddedMask |
| `useOrgPermissionsGetPaddedMaskQuery` | Query | orgPermissionsGetPaddedMask |
| `useRevParseQuery` | Query | revParse |
| `useResolveBlueprintFieldQuery` | Query | Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this. |
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
| `useCurrentUserQuery` | Query | currentUser |
| `useSendAccountDeletionEmailMutation` | Mutation | sendAccountDeletionEmail |
| `useSignOutMutation` | Mutation | signOut |
| `useAcceptDatabaseTransferMutation` | Mutation | acceptDatabaseTransfer |
| `useCancelDatabaseTransferMutation` | Mutation | cancelDatabaseTransfer |
| `useRejectDatabaseTransferMutation` | Mutation | rejectDatabaseTransfer |
| `useDisconnectAccountMutation` | Mutation | disconnectAccount |
| `useRevokeApiKeyMutation` | Mutation | revokeApiKey |
| `useRevokeSessionMutation` | Mutation | revokeSession |
| `useVerifyPasswordMutation` | Mutation | verifyPassword |
| `useVerifyTotpMutation` | Mutation | verifyTotp |
| `useSubmitAppInviteCodeMutation` | Mutation | submitAppInviteCode |
| `useSubmitOrgInviteCodeMutation` | Mutation | submitOrgInviteCode |
| `useCheckPasswordMutation` | Mutation | checkPassword |
| `useConfirmDeleteAccountMutation` | Mutation | confirmDeleteAccount |
| `useSetPasswordMutation` | Mutation | setPassword |
| `useVerifyEmailMutation` | Mutation | verifyEmail |
| `useFreezeObjectsMutation` | Mutation | freezeObjects |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useConstructBlueprintMutation` | Mutation | Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When infra_public exists, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure. |
| `useProvisionNewUserMutation` | Mutation | provisionNewUser |
| `useResetPasswordMutation` | Mutation | resetPassword |
| `useRemoveNodeAtPathMutation` | Mutation | removeNodeAtPath |
| `useCopyTemplateToBlueprintMutation` | Mutation | Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID. |
| `useProvisionSpatialRelationMutation` | Mutation | Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert. |
| `useSignInCrossOriginMutation` | Mutation | signInCrossOrigin |
| `useBootstrapUserMutation` | Mutation | bootstrapUser |
| `useSignUpMutation` | Mutation | signUp |
| `useSignInMutation` | Mutation | signIn |
| `useSetFieldOrderMutation` | Mutation | setFieldOrder |
| `useProvisionCheckConstraintMutation` | Mutation | Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists. |
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
| `useCreateUserDatabaseMutation` | Mutation | Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include events/analytics (default: false)
  - bitlen: Bit length for permission masks (default: 64)
  - tokens_expiration: Token expiration interval (default: 30 days)

Returns the database_id UUID of the newly created database.

Example usage:
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
  SELECT metaschema_public.create_user_database('my_app', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, true, true);  -- with invites and groups
 |
| `useExtendTokenExpiresMutation` | Mutation | extendTokenExpires |
| `useCreateApiKeyMutation` | Mutation | createApiKey |
| `useRequestCrossOriginTokenMutation` | Mutation | requestCrossOriginToken |
| `useProvisionTableMutation` | Mutation | Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields). |
| `useSendVerificationEmailMutation` | Mutation | sendVerificationEmail |
| `useForgotPasswordMutation` | Mutation | forgotPassword |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

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
  selection: { fields: { hashUuid: true, id: true, scopeId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Get one object
const { data: item } = useObjectQuery({
  id: '<UUID>',
  selection: { fields: { hashUuid: true, id: true, scopeId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});

// Create a object
const { mutate: create } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
create({ hashUuid: '<UUID>', scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>', frzn: '<Boolean>' });
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
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, partitioned: true, partitionStrategy: true, partitionKeyNames: true, partitionKeyTypes: true, inheritsId: true, createdAt: true, updatedAt: true } },
});

// Get one table
const { data: item } = useTableQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, partitioned: true, partitionStrategy: true, partitionKeyNames: true, partitionKeyTypes: true, inheritsId: true, createdAt: true, updatedAt: true } },
});

// Create a table
const { mutate: create } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', partitioned: '<Boolean>', partitionStrategy: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', inheritsId: '<UUID>' });
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

### SpatialRelation

```typescript
// List all spatialRelations
const { data, isLoading } = useSpatialRelationsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, refTableId: true, refFieldId: true, name: true, operator: true, paramName: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one spatialRelation
const { data: item } = useSpatialRelationQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, refTableId: true, refFieldId: true, name: true, operator: true, paramName: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a spatialRelation
const { mutate: create } = useCreateSpatialRelationMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
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
  selection: { fields: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, searchIndexes: true, enqueueChunkingJob: true, chunkingTaskName: true, embeddingModel: true, embeddingProvider: true, parentFkFieldId: true, createdAt: true, updatedAt: true } },
});

// Get one embeddingChunk
const { data: item } = useEmbeddingChunkQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, embeddingFieldId: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, dimensions: true, metric: true, chunkSize: true, chunkOverlap: true, chunkStrategy: true, metadataFields: true, searchIndexes: true, enqueueChunkingJob: true, chunkingTaskName: true, embeddingModel: true, embeddingProvider: true, parentFkFieldId: true, createdAt: true, updatedAt: true } },
});

// Create a embeddingChunk
const { mutate: create } = useCreateEmbeddingChunkMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', embeddingFieldId: '<UUID>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', dimensions: '<Int>', metric: '<String>', chunkSize: '<Int>', chunkOverlap: '<Int>', chunkStrategy: '<String>', metadataFields: '<JSON>', searchIndexes: '<JSON>', enqueueChunkingJob: '<Boolean>', chunkingTaskName: '<String>', embeddingModel: '<String>', embeddingProvider: '<String>', parentFkFieldId: '<UUID>' });
```

### SecureTableProvision

```typescript
// List all secureTableProvisions
const { data, isLoading } = useSecureTableProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodes: true, useRls: true, fields: true, grants: true, policies: true, outFields: true } },
});

// Get one secureTableProvision
const { data: item } = useSecureTableProvisionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodes: true, useRls: true, fields: true, grants: true, policies: true, outFields: true } },
});

// Create a secureTableProvision
const { mutate: create } = useCreateSecureTableProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', nodes: '<JSON>', useRls: '<Boolean>', fields: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFields: '<UUID>' });
```

### RelationProvision

```typescript
// List all relationProvisions
const { data, isLoading } = useRelationProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, apiRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, createIndex: true, exposeInApi: true, nodes: true, grants: true, policies: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true } },
});

// Get one relationProvision
const { data: item } = useRelationProvisionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, relationType: true, sourceTableId: true, targetTableId: true, fieldName: true, deleteAction: true, isRequired: true, apiRequired: true, junctionTableId: true, junctionTableName: true, junctionSchemaId: true, sourceFieldName: true, targetFieldName: true, useCompositeKey: true, createIndex: true, exposeInApi: true, nodes: true, grants: true, policies: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true } },
});

// Create a relationProvision
const { mutate: create } = useCreateRelationProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', relationType: '<String>', sourceTableId: '<UUID>', targetTableId: '<UUID>', fieldName: '<String>', deleteAction: '<String>', isRequired: '<Boolean>', apiRequired: '<Boolean>', junctionTableId: '<UUID>', junctionTableName: '<String>', junctionSchemaId: '<UUID>', sourceFieldName: '<String>', targetFieldName: '<String>', useCompositeKey: '<Boolean>', createIndex: '<Boolean>', exposeInApi: '<Boolean>', nodes: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>' });
```

### SessionSecretsModule

```typescript
// List all sessionSecretsModules
const { data, isLoading } = useSessionSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, sessionsTableId: true } },
});

// Get one sessionSecretsModule
const { data: item } = useSessionSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, sessionsTableId: true } },
});

// Create a sessionSecretsModule
const { mutate: create } = useCreateSessionSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', sessionsTableId: '<UUID>' });
```

### IdentityProvidersModule

```typescript
// List all identityProvidersModules
const { data, isLoading } = useIdentityProvidersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true } },
});

// Get one identityProvidersModule
const { data: item } = useIdentityProvidersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true } },
});

// Create a identityProvidersModule
const { mutate: create } = useCreateIdentityProvidersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### RealtimeModule

```typescript
// List all realtimeModules
const { data, isLoading } = useRealtimeModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true } },
});

// Get one realtimeModule
const { data: item } = useRealtimeModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true } },
});

// Create a realtimeModule
const { mutate: create } = useCreateRealtimeModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', subscriptionsSchemaId: '<UUID>', changeLogTableId: '<UUID>', listenerNodeTableId: '<UUID>', sourceRegistryTableId: '<UUID>', retentionHours: '<Int>', premake: '<Int>', interval: '<String>', notifyChannel: '<String>' });
```

### ConfigSecretsOrgModule

```typescript
// List all configSecretsOrgModules
const { data, isLoading } = useConfigSecretsOrgModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one configSecretsOrgModule
const { data: item } = useConfigSecretsOrgModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a configSecretsOrgModule
const { mutate: create } = useCreateConfigSecretsOrgModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
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

### Function

```typescript
// List all functions
const { data, isLoading } = useFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true } },
});

// Get one function
const { data: item } = useFunctionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true } },
});

// Create a function
const { mutate: create } = useCreateFunctionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>' });
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

### CorsSetting

```typescript
// List all corsSettings
const { data, isLoading } = useCorsSettingsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, allowedOrigins: true } },
});

// Get one corsSetting
const { data: item } = useCorsSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, apiId: true, allowedOrigins: true } },
});

// Create a corsSetting
const { mutate: create } = useCreateCorsSettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', apiId: '<UUID>', allowedOrigins: '<String>' });
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

### Partition

```typescript
// List all partitions
const { data, isLoading } = usePartitionsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, createdAt: true, updatedAt: true } },
});

// Get one partition
const { data: item } = usePartitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, createdAt: true, updatedAt: true } },
});

// Create a partition
const { mutate: create } = useCreatePartitionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', strategy: '<String>', partitionKeyId: '<UUID>', interval: '<String>', retention: '<String>', retentionKeepTable: '<Boolean>', premake: '<Int>', namingPattern: '<String>' });
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

### ApiSetting

```typescript
// List all apiSettings
const { data, isLoading } = useApiSettingsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, options: true } },
});

// Get one apiSetting
const { data: item } = useApiSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, options: true } },
});

// Create a apiSetting
const { mutate: create } = useCreateApiSettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', apiId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', options: '<JSON>' });
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

### ConfigSecretsUserModule

```typescript
// List all configSecretsUserModules
const { data, isLoading } = useConfigSecretsUserModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one configSecretsUserModule
const { data: item } = useConfigSecretsUserModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a configSecretsUserModule
const { mutate: create } = useCreateConfigSecretsUserModuleMutation({
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

### EventsModule

```typescript
// List all eventsModules
const { data, isLoading } = useEventsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, pruneEvents: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Get one eventsModule
const { data: item } = useEventsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, pruneEvents: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Create a eventsModule
const { mutate: create } = useCreateEventsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', eventsTableId: '<UUID>', eventsTableName: '<String>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', recordEvent: '<String>', removeEvent: '<String>', tgEvent: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgEventBool: '<String>', upsertAggregate: '<String>', tgUpdateAggregates: '<String>', pruneEvents: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', tgCheckAchievements: '<String>', grantAchievement: '<String>', tgAchievementReward: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' });
```

### LimitsModule

```typescript
// List all limitsModules
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Get one limitsModule
const { data: item } = useLimitsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Create a limitsModule
const { mutate: create } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', limitCreditsTableId: '<UUID>', eventsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditCodeItemsTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', aggregateTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCapsDefaultsTableId: '<UUID>', capCheckTrigger: '<String>', resolveCapFunction: '<String>', limitWarningsTableId: '<UUID>', limitWarningStateTableId: '<UUID>', limitCheckSoftFunction: '<String>', limitAggregateCheckSoftFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' });
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
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true } },
});

// Get one membershipsModule
const { data: item } = useMembershipsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true } },
});

// Create a membershipsModule
const { mutate: create } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', actorTableId: '<UUID>', limitsTableId: '<UUID>', defaultLimitsTableId: '<UUID>', permissionsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', sprtTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', prefix: '<String>', actorMaskCheck: '<String>', actorPermCheck: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', memberProfilesTableId: '<UUID>' });
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
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } },
});

// Get one profilesModule
const { data: item } = useProfilesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } },
});

// Create a profilesModule
const { mutate: create } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', prefix: '<String>' });
```

### UserStateModule

```typescript
// List all userStateModules
const { data, isLoading } = useUserStateModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one userStateModule
const { data: item } = useUserStateModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a userStateModule
const { mutate: create } = useCreateUserStateModuleMutation({
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
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true } },
});

// Get one userAuthModule
const { data: item } = useUserAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true } },
});

// Create a userAuthModule
const { mutate: create } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInCrossOriginFunction: '<String>', requestCrossOriginTokenFunction: '<String>', extendTokenExpires: '<String>' });
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
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, membershipType: true, storageKey: true, policies: true, skipDefaultPolicyTables: true, entityTableId: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true } },
});

// Get one storageModule
const { data: item } = useStorageModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, membershipType: true, storageKey: true, policies: true, skipDefaultPolicyTables: true, entityTableId: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true } },
});

// Create a storageModule
const { mutate: create } = useCreateStorageModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', membershipType: '<Int>', storageKey: '<String>', policies: '<JSON>', skipDefaultPolicyTables: '<String>', entityTableId: '<UUID>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', restrictReads: '<Boolean>', hasPathShares: '<Boolean>', pathSharesTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', hasVersioning: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', confirmUploadDelay: '<Interval>', fileEventsTableId: '<UUID>' });
```

### EntityTypeProvision

```typescript
// List all entityTypeProvisions
const { data, isLoading } = useEntityTypeProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasStorage: true, hasInvites: true, hasInviteAchievements: true, storageConfig: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true } },
});

// Get one entityTypeProvision
const { data: item } = useEntityTypeProvisionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasStorage: true, hasInvites: true, hasInviteAchievements: true, storageConfig: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true } },
});

// Create a entityTypeProvision
const { mutate: create } = useCreateEntityTypeProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', prefix: '<String>', description: '<String>', parentEntity: '<String>', tableName: '<String>', isVisible: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', hasLevels: '<Boolean>', hasStorage: '<Boolean>', hasInvites: '<Boolean>', hasInviteAchievements: '<Boolean>', storageConfig: '<JSON>', skipEntityPolicies: '<Boolean>', tableProvision: '<JSON>', outMembershipType: '<Int>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outInstalledModules: '<String>', outStorageModuleId: '<UUID>', outBucketsTableId: '<UUID>', outFilesTableId: '<UUID>', outPathSharesTableId: '<UUID>', outInvitesModuleId: '<UUID>' });
```

### WebauthnCredentialsModule

```typescript
// List all webauthnCredentialsModules
const { data, isLoading } = useWebauthnCredentialsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Get one webauthnCredentialsModule
const { data: item } = useWebauthnCredentialsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Create a webauthnCredentialsModule
const { mutate: create } = useCreateWebauthnCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' });
```

### WebauthnAuthModule

```typescript
// List all webauthnAuthModules
const { data, isLoading } = useWebauthnAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, authSettingsTableId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpiry: true } },
});

// Get one webauthnAuthModule
const { data: item } = useWebauthnAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, authSettingsTableId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpiry: true } },
});

// Create a webauthnAuthModule
const { mutate: create } = useCreateWebauthnAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', usersTableId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', authSettingsTableId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpiry: '<Interval>' });
```

### NotificationsModule

```typescript
// List all notificationsModules
const { data, isLoading } = useNotificationsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true } },
});

// Get one notificationsModule
const { data: item } = useNotificationsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true } },
});

// Create a notificationsModule
const { mutate: create } = useCreateNotificationsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', notificationsTableId: '<UUID>', readStateTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', hasChannels: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasDigestMetadata: '<Boolean>', hasSubscriptions: '<Boolean>' });
```

### InferenceLogModule

```typescript
// List all inferenceLogModules
const { data, isLoading } = useInferenceLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Get one inferenceLogModule
const { data: item } = useInferenceLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Create a inferenceLogModule
const { mutate: create } = useCreateInferenceLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' });
```

### ComputeLogModule

```typescript
// List all computeLogModules
const { data, isLoading } = useComputeLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Get one computeLogModule
const { data: item } = useComputeLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Create a computeLogModule
const { mutate: create } = useCreateComputeLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' });
```

### TransferLogModule

```typescript
// List all transferLogModules
const { data, isLoading } = useTransferLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Get one transferLogModule
const { data: item } = useTransferLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Create a transferLogModule
const { mutate: create } = useCreateTransferLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' });
```

### StorageLogModule

```typescript
// List all storageLogModules
const { data, isLoading } = useStorageLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Get one storageLogModule
const { data: item } = useStorageLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});

// Create a storageLogModule
const { mutate: create } = useCreateStorageLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' });
```

### DbUsageModule

```typescript
// List all dbUsageModules
const { data, isLoading } = useDbUsageModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, interval: true, retention: true, premake: true, scope: true, prefix: true } },
});

// Get one dbUsageModule
const { data: item } = useDbUsageModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, interval: true, retention: true, premake: true, scope: true, prefix: true } },
});

// Create a dbUsageModule
const { mutate: create } = useCreateDbUsageModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>' });
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
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } },
});

// Get one orgMembership
const { data: item } = useOrgMembershipQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } },
});

// Create a orgMembership
const { mutate: create } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', isReadOnly: '<Boolean>', profileId: '<UUID>' });
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

### OrgMemberProfile

```typescript
// List all orgMemberProfiles
const { data, isLoading } = useOrgMemberProfilesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } },
});

// Get one orgMemberProfile
const { data: item } = useOrgMemberProfileQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } },
});

// Create a orgMemberProfile
const { mutate: create } = useCreateOrgMemberProfileMutation({
  selection: { fields: { id: true } },
});
create({ membershipId: '<UUID>', entityId: '<UUID>', actorId: '<UUID>', displayName: '<String>', email: '<String>', title: '<String>', bio: '<String>', profilePicture: '<Image>' });
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
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true } },
});

// Get one appLimit
const { data: item } = useAppLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true } },
});

// Create a appLimit
const { mutate: create } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>' });
```

### AppLimitCredit

```typescript
// List all appLimitCredits
const { data, isLoading } = useAppLimitCreditsQuery({
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } },
});

// Get one appLimitCredit
const { data: item } = useAppLimitCreditQuery({
  id: '<UUID>',
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } },
});

// Create a appLimitCredit
const { mutate: create } = useCreateAppLimitCreditMutation({
  selection: { fields: { id: true } },
});
create({ defaultLimitId: '<UUID>', actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' });
```

### AppLimitCreditCodeItem

```typescript
// List all appLimitCreditCodeItems
const { data, isLoading } = useAppLimitCreditCodeItemsQuery({
  selection: { fields: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } },
});

// Get one appLimitCreditCodeItem
const { data: item } = useAppLimitCreditCodeItemQuery({
  id: '<UUID>',
  selection: { fields: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } },
});

// Create a appLimitCreditCodeItem
const { mutate: create } = useCreateAppLimitCreditCodeItemMutation({
  selection: { fields: { id: true } },
});
create({ creditCodeId: '<UUID>', defaultLimitId: '<UUID>', amount: '<BigInt>', creditType: '<String>' });
```

### AppLimitCreditRedemption

```typescript
// List all appLimitCreditRedemptions
const { data, isLoading } = useAppLimitCreditRedemptionsQuery({
  selection: { fields: { id: true, creditCodeId: true, entityId: true } },
});

// Get one appLimitCreditRedemption
const { data: item } = useAppLimitCreditRedemptionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, creditCodeId: true, entityId: true } },
});

// Create a appLimitCreditRedemption
const { mutate: create } = useCreateAppLimitCreditRedemptionMutation({
  selection: { fields: { id: true } },
});
create({ creditCodeId: '<UUID>', entityId: '<UUID>' });
```

### OrgLimit

```typescript
// List all orgLimits
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true } },
});

// Get one orgLimit
const { data: item } = useOrgLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true } },
});

// Create a orgLimit
const { mutate: create } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', entityId: '<UUID>' });
```

### OrgLimitCredit

```typescript
// List all orgLimitCredits
const { data, isLoading } = useOrgLimitCreditsQuery({
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, amount: true, creditType: true, reason: true } },
});

// Get one orgLimitCredit
const { data: item } = useOrgLimitCreditQuery({
  id: '<UUID>',
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, amount: true, creditType: true, reason: true } },
});

// Create a orgLimitCredit
const { mutate: create } = useCreateOrgLimitCreditMutation({
  selection: { fields: { id: true } },
});
create({ defaultLimitId: '<UUID>', actorId: '<UUID>', entityId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' });
```

### OrgLimitAggregate

```typescript
// List all orgLimitAggregates
const { data, isLoading } = useOrgLimitAggregatesQuery({
  selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true } },
});

// Get one orgLimitAggregate
const { data: item } = useOrgLimitAggregateQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true } },
});

// Create a orgLimitAggregate
const { mutate: create } = useCreateOrgLimitAggregateMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', entityId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', reserved: '<BigInt>' });
```

### OrgLimitWarning

```typescript
// List all orgLimitWarnings
const { data, isLoading } = useOrgLimitWarningsQuery({
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } },
});

// Get one orgLimitWarning
const { data: item } = useOrgLimitWarningQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } },
});

// Create a orgLimitWarning
const { mutate: create } = useCreateOrgLimitWarningMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>', entityId: '<UUID>' });
```

### Email

```typescript
// List all emails
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Get one email
const { data: item } = useEmailQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Create a email
const { mutate: create } = useCreateEmailMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', email: '<Email>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' });
```

### PhoneNumber

```typescript
// List all phoneNumbers
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Get one phoneNumber
const { data: item } = usePhoneNumberQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Create a phoneNumber
const { mutate: create } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', cc: '<String>', number: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' });
```

### CryptoAddress

```typescript
// List all cryptoAddresses
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Get one cryptoAddress
const { data: item } = useCryptoAddressQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Create a cryptoAddress
const { mutate: create } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', address: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' });
```

### WebauthnCredential

```typescript
// List all webauthnCredentials
const { data, isLoading } = useWebauthnCredentialsQuery({
  selection: { fields: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } },
});

// Get one webauthnCredential
const { data: item } = useWebauthnCredentialQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } },
});

// Create a webauthnCredential
const { mutate: create } = useCreateWebauthnCredentialMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', credentialId: '<String>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', webauthnUserId: '<String>', transports: '<String>', credentialDeviceType: '<String>', backupEligible: '<Boolean>', backupState: '<Boolean>', name: '<String>', lastUsedAt: '<Datetime>' });
```

### AppInvite

```typescript
// List all appInvites
const { data, isLoading } = useAppInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Get one appInvite
const { data: item } = useAppInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Create a appInvite
const { mutate: create } = useCreateAppInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', profileId: '<UUID>', expiresAt: '<Datetime>' });
```

### AppClaimedInvite

```typescript
// List all appClaimedInvites
const { data, isLoading } = useAppClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Get one appClaimedInvite
const { data: item } = useAppClaimedInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Create a appClaimedInvite
const { mutate: create } = useCreateAppClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' });
```

### OrgInvite

```typescript
// List all orgInvites
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, isReadOnly: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgInvite
const { data: item } = useOrgInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, isReadOnly: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgInvite
const { mutate: create } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<Email>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', profileId: '<UUID>', isReadOnly: '<Boolean>', expiresAt: '<Datetime>', entityId: '<UUID>' });
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

### AuditLogAuth

```typescript
// List all auditLogAuths
const { data, isLoading } = useAuditLogAuthsQuery({
  selection: { fields: { createdAt: true, id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true } },
});

// Get one auditLogAuth
const { data: item } = useAuditLogAuthQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true } },
});

// Create a auditLogAuth
const { mutate: create } = useCreateAuditLogAuthMutation({
  selection: { fields: { id: true } },
});
create({ event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' });
```

### IdentityProvider

```typescript
// List all identityProviders
const { data, isLoading } = useIdentityProvidersQuery({
  selection: { fields: { slug: true, kind: true, displayName: true, enabled: true, isBuiltIn: true } },
});

// Create a identityProvider
const { mutate: create } = useCreateIdentityProviderMutation({
  selection: { fields: { id: true } },
});
create({ slug: '<String>', kind: '<String>', displayName: '<String>', enabled: '<Boolean>', isBuiltIn: '<Boolean>' });
```

### Ref

```typescript
// List all refs
const { data, isLoading } = useRefsQuery({
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Get one ref
const { data: item } = useRefQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Create a ref
const { mutate: create } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```

### Store

```typescript
// List all stores
const { data, isLoading } = useStoresQuery({
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Get one store
const { data: item } = useStoreQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Create a store
const { mutate: create } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', hash: '<UUID>' });
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

### DevicesModule

```typescript
// List all devicesModules
const { data, isLoading } = useDevicesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, userDevicesTableId: true, deviceSettingsTableId: true, userDevicesTable: true, deviceSettingsTable: true } },
});

// Get one devicesModule
const { data: item } = useDevicesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, userDevicesTableId: true, deviceSettingsTableId: true, userDevicesTable: true, deviceSettingsTable: true } },
});

// Create a devicesModule
const { mutate: create } = useCreateDevicesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', deviceSettingsTableId: '<UUID>', userDevicesTable: '<String>', deviceSettingsTable: '<String>' });
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

### OrgMembershipDefault

```typescript
// List all orgMembershipDefaults
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } },
});

// Get one orgMembershipDefault
const { data: item } = useOrgMembershipDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } },
});

// Create a orgMembershipDefault
const { mutate: create } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>' });
```

### NodeTypeRegistry

```typescript
// List all nodeTypeRegistries
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true } },
});

// Get one nodeTypeRegistry
const { data: item } = useNodeTypeRegistryQuery({
  name: '<String>',
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true } },
});

// Create a nodeTypeRegistry
const { mutate: create } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
create({ slug: '<String>', category: '<String>', displayName: '<String>', description: '<String>', parameterSchema: '<JSON>', tags: '<String>' });
```

### AppLimitCapsDefault

```typescript
// List all appLimitCapsDefaults
const { data, isLoading } = useAppLimitCapsDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one appLimitCapsDefault
const { data: item } = useAppLimitCapsDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a appLimitCapsDefault
const { mutate: create } = useCreateAppLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>' });
```

### OrgLimitCapsDefault

```typescript
// List all orgLimitCapsDefaults
const { data, isLoading } = useOrgLimitCapsDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one orgLimitCapsDefault
const { data: item } = useOrgLimitCapsDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a orgLimitCapsDefault
const { mutate: create } = useCreateOrgLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>' });
```

### AppLimitCap

```typescript
// List all appLimitCaps
const { data, isLoading } = useAppLimitCapsQuery({
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Get one appLimitCap
const { data: item } = useAppLimitCapQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Create a appLimitCap
const { mutate: create } = useCreateAppLimitCapMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', entityId: '<UUID>', max: '<BigInt>' });
```

### OrgLimitCap

```typescript
// List all orgLimitCaps
const { data, isLoading } = useOrgLimitCapsQuery({
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Get one orgLimitCap
const { data: item } = useOrgLimitCapQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Create a orgLimitCap
const { mutate: create } = useCreateOrgLimitCapMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', entityId: '<UUID>', max: '<BigInt>' });
```

### UserConnectedAccount

```typescript
// List all userConnectedAccounts
const { data, isLoading } = useUserConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Get one userConnectedAccount
const { data: item } = useUserConnectedAccountQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Create a userConnectedAccount
const { mutate: create } = useCreateUserConnectedAccountMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' });
```

### AppLimitDefault

```typescript
// List all appLimitDefaults
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Get one appLimitDefault
const { data: item } = useAppLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Create a appLimitDefault
const { mutate: create } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>', softMax: '<BigInt>' });
```

### OrgLimitDefault

```typescript
// List all orgLimitDefaults
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Get one orgLimitDefault
const { data: item } = useOrgLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Create a orgLimitDefault
const { mutate: create } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>', softMax: '<BigInt>' });
```

### AppLimitCreditCode

```typescript
// List all appLimitCreditCodes
const { data, isLoading } = useAppLimitCreditCodesQuery({
  selection: { fields: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } },
});

// Get one appLimitCreditCode
const { data: item } = useAppLimitCreditCodeQuery({
  id: '<UUID>',
  selection: { fields: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } },
});

// Create a appLimitCreditCode
const { mutate: create } = useCreateAppLimitCreditCodeMutation({
  selection: { fields: { id: true } },
});
create({ code: '<String>', maxRedemptions: '<Int>', currentRedemptions: '<Int>', expiresAt: '<Datetime>' });
```

### AppLimitWarning

```typescript
// List all appLimitWarnings
const { data, isLoading } = useAppLimitWarningsQuery({
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } },
});

// Get one appLimitWarning
const { data: item } = useAppLimitWarningQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } },
});

// Create a appLimitWarning
const { mutate: create } = useCreateAppLimitWarningMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>' });
```

### Commit

```typescript
// List all commits
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one commit
const { data: item } = useCommitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a commit
const { mutate: create } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```

### PubkeySetting

```typescript
// List all pubkeySettings
const { data, isLoading } = usePubkeySettingsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, cryptoNetwork: true, userField: true, signUpWithKeyFunctionId: true, signInRequestChallengeFunctionId: true, signInRecordFailureFunctionId: true, signInWithChallengeFunctionId: true } },
});

// Get one pubkeySetting
const { data: item } = usePubkeySettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, cryptoNetwork: true, userField: true, signUpWithKeyFunctionId: true, signInRequestChallengeFunctionId: true, signInRecordFailureFunctionId: true, signInWithChallengeFunctionId: true } },
});

// Create a pubkeySetting
const { mutate: create } = useCreatePubkeySettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', cryptoNetwork: '<String>', userField: '<String>', signUpWithKeyFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>' });
```

### RateLimitsModule

```typescript
// List all rateLimitsModules
const { data, isLoading } = useRateLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, rateLimitSettingsTableId: true, ipRateLimitsTableId: true, rateLimitsTableId: true, rateLimitSettingsTable: true, ipRateLimitsTable: true, rateLimitsTable: true } },
});

// Get one rateLimitsModule
const { data: item } = useRateLimitsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, rateLimitSettingsTableId: true, ipRateLimitsTableId: true, rateLimitsTableId: true, rateLimitSettingsTable: true, ipRateLimitsTable: true, rateLimitsTable: true } },
});

// Create a rateLimitsModule
const { mutate: create } = useCreateRateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', rateLimitSettingsTableId: '<UUID>', ipRateLimitsTableId: '<UUID>', rateLimitsTableId: '<UUID>', rateLimitSettingsTable: '<String>', ipRateLimitsTable: '<String>', rateLimitsTable: '<String>' });
```

### MembershipType

```typescript
// List all membershipTypes
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } },
});

// Get one membershipType
const { data: item } = useMembershipTypeQuery({
  id: '<Int>',
  selection: { fields: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } },
});

// Create a membershipType
const { mutate: create } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', prefix: '<String>', parentMembershipType: '<Int>', hasUsersTableEntry: '<Boolean>' });
```

### RlsSetting

```typescript
// List all rlsSettings
const { data, isLoading } = useRlsSettingsQuery({
  selection: { fields: { id: true, databaseId: true, authenticateSchemaId: true, roleSchemaId: true, authenticateFunctionId: true, authenticateStrictFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, currentIpAddressFunctionId: true } },
});

// Get one rlsSetting
const { data: item } = useRlsSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, authenticateSchemaId: true, roleSchemaId: true, authenticateFunctionId: true, authenticateStrictFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, currentIpAddressFunctionId: true } },
});

// Create a rlsSetting
const { mutate: create } = useCreateRlsSettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', authenticateSchemaId: '<UUID>', roleSchemaId: '<UUID>', authenticateFunctionId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>' });
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

### AgentChatModule

```typescript
// List all agentChatModules
const { data, isLoading } = useAgentChatModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, apiId: true, threadTableId: true, threadTableName: true, messageTableId: true, messageTableName: true, taskTableId: true, taskTableName: true, prefix: true } },
});

// Get one agentChatModule
const { data: item } = useAgentChatModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, apiId: true, threadTableId: true, threadTableName: true, messageTableId: true, messageTableName: true, taskTableId: true, taskTableName: true, prefix: true } },
});

// Create a agentChatModule
const { mutate: create } = useCreateAgentChatModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', apiId: '<UUID>', threadTableId: '<UUID>', threadTableName: '<String>', messageTableId: '<UUID>', messageTableName: '<String>', taskTableId: '<UUID>', taskTableName: '<String>', prefix: '<String>' });
```

### RateLimitMetersModule

```typescript
// List all rateLimitMetersModules
const { data, isLoading } = useRateLimitMetersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true } },
});

// Get one rateLimitMetersModule
const { data: item } = useRateLimitMetersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true } },
});

// Create a rateLimitMetersModule
const { mutate: create } = useCreateRateLimitMetersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', checkRateLimitFunction: '<String>', prefix: '<String>' });
```

### PlansModule

```typescript
// List all plansModules
const { data, isLoading } = usePlansModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, prefix: true } },
});

// Get one plansModule
const { data: item } = usePlansModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, prefix: true } },
});

// Create a plansModule
const { mutate: create } = useCreatePlansModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', plansTableId: '<UUID>', plansTableName: '<String>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planPricingTableId: '<UUID>', planOverridesTableId: '<UUID>', applyPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', prefix: '<String>' });
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

### AppLimitEvent

```typescript
// List all appLimitEvents
const { data, isLoading } = useAppLimitEventsQuery({
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Get one appLimitEvent
const { data: item } = useAppLimitEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Create a appLimitEvent
const { mutate: create } = useCreateAppLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', entityId: '<UUID>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' });
```

### OrgLimitEvent

```typescript
// List all orgLimitEvents
const { data, isLoading } = useOrgLimitEventsQuery({
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Get one orgLimitEvent
const { data: item } = useOrgLimitEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Create a orgLimitEvent
const { mutate: create } = useCreateOrgLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', entityId: '<UUID>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' });
```

### DatabaseSetting

```typescript
// List all databaseSettings
const { data, isLoading } = useDatabaseSettingsQuery({
  selection: { fields: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, options: true } },
});

// Get one databaseSetting
const { data: item } = useDatabaseSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, options: true } },
});

// Create a databaseSetting
const { mutate: create } = useCreateDatabaseSettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', options: '<JSON>' });
```

### OrgMembershipSetting

```typescript
// List all orgMembershipSettings
const { data, isLoading } = useOrgMembershipSettingsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, inviteProfileAssignmentMode: true, populateMemberEmail: true, limitAllocationMode: true } },
});

// Get one orgMembershipSetting
const { data: item } = useOrgMembershipSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, inviteProfileAssignmentMode: true, populateMemberEmail: true, limitAllocationMode: true } },
});

// Create a orgMembershipSetting
const { mutate: create } = useCreateOrgMembershipSettingMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', entityId: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', createChildCascadeOwners: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', allowExternalMembers: '<Boolean>', inviteProfileAssignmentMode: '<String>', populateMemberEmail: '<Boolean>', limitAllocationMode: '<String>' });
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

### WebauthnSetting

```typescript
// List all webauthnSettings
const { data, isLoading } = useWebauthnSettingsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, credentialsSchemaId: true, sessionsSchemaId: true, sessionSecretsSchemaId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, userFieldId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpirySeconds: true } },
});

// Get one webauthnSetting
const { data: item } = useWebauthnSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, credentialsSchemaId: true, sessionsSchemaId: true, sessionSecretsSchemaId: true, credentialsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, userFieldId: true, rpId: true, rpName: true, originAllowlist: true, attestationType: true, requireUserVerification: true, residentKey: true, challengeExpirySeconds: true } },
});

// Create a webauthnSetting
const { mutate: create } = useCreateWebauthnSettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', credentialsSchemaId: '<UUID>', sessionsSchemaId: '<UUID>', sessionSecretsSchemaId: '<UUID>', credentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', userFieldId: '<UUID>', rpId: '<String>', rpName: '<String>', originAllowlist: '<String>', attestationType: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', challengeExpirySeconds: '<BigInt>' });
```

### BillingModule

```typescript
// List all billingModules
const { data, isLoading } = useBillingModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, recordUsageFunction: true, prefix: true } },
});

// Get one billingModule
const { data: item } = useBillingModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, recordUsageFunction: true, prefix: true } },
});

// Create a billingModule
const { mutate: create } = useCreateBillingModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', recordUsageFunction: '<String>', prefix: '<String>' });
```

### BillingProviderModule

```typescript
// List all billingProviderModules
const { data, isLoading } = useBillingProviderModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true } },
});

// Get one billingProviderModule
const { data: item } = useBillingProviderModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true } },
});

// Create a billingProviderModule
const { mutate: create } = useCreateBillingProviderModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', provider: '<String>', productsTableId: '<UUID>', pricesTableId: '<UUID>', subscriptionsTableId: '<UUID>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', processBillingEventFunction: '<String>', prefix: '<String>' });
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

### `useCurrentUserAgentQuery`

currentUserAgent

- **Type:** query
- **Arguments:** none

### `useCurrentIpAddressQuery`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `useRequireStepUpQuery`

requireStepUp

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `stepUpType` | String |

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

### `useRevParseQuery`

revParse

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `sId` | UUID |
  | `storeId` | UUID |
  | `refname` | String |

### `useResolveBlueprintFieldQuery`

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `tableId` | UUID |
  | `fieldName` | String |

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
  | `sId` | UUID |
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
  | `sId` | UUID |
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
  | `sId` | UUID |
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

### `useDisconnectAccountMutation`

disconnectAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | DisconnectAccountInput (required) |

### `useRevokeApiKeyMutation`

revokeApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeApiKeyInput (required) |

### `useRevokeSessionMutation`

revokeSession

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeSessionInput (required) |

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

### `useSubmitAppInviteCodeMutation`

submitAppInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitAppInviteCodeInput (required) |

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

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When infra_public exists, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConstructBlueprintInput (required) |

### `useProvisionNewUserMutation`

provisionNewUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionNewUserInput (required) |

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

### `useProvisionSpatialRelationMutation`

Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionSpatialRelationInput (required) |

### `useSignInCrossOriginMutation`

signInCrossOrigin

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInCrossOriginInput (required) |

### `useBootstrapUserMutation`

bootstrapUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | BootstrapUserInput (required) |

### `useSignUpMutation`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

### `useSignInMutation`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

### `useSetFieldOrderMutation`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetFieldOrderInput (required) |

### `useProvisionCheckConstraintMutation`

Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionCheckConstraintInput (required) |

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

### `useCreateUserDatabaseMutation`

Creates a new user database with all required modules, permissions, and RLS policies.

Parameters:
  - database_name: Name for the new database (required)
  - owner_id: UUID of the owner user (required)
  - include_invites: Include invite system (default: true)
  - include_groups: Include group-level memberships (default: false)
  - include_levels: Include events/analytics (default: false)
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

### `useCreateApiKeyMutation`

createApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CreateApiKeyInput (required) |

### `useRequestCrossOriginTokenMutation`

requestCrossOriginToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RequestCrossOriginTokenInput (required) |

### `useProvisionTableMutation`

Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

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

### `useProvisionBucketMutation`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
