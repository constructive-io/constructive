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
| `useFunctionsQuery` | Query | List all functions |
| `useFunctionQuery` | Query | Get one function |
| `useCreateFunctionMutation` | Mutation | Create a function |
| `useUpdateFunctionMutation` | Mutation | Update a function |
| `useDeleteFunctionMutation` | Mutation | Delete a function |
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
| `usePartitionsQuery` | Query | List all partitions |
| `usePartitionQuery` | Query | Get one partition |
| `useCreatePartitionMutation` | Mutation | Create a partition |
| `useUpdatePartitionMutation` | Mutation | Update a partition |
| `useDeletePartitionMutation` | Mutation | Delete a partition |
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
| `useApiSettingsQuery` | Query | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useApiSettingQuery` | Query | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useCreateApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useUpdateApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useDeleteApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useMigrateFilesQuery` | Query | List all migrateFiles |
| `useMigrateFileQuery` | Query | Get one migrateFile |
| `useCreateMigrateFileMutation` | Mutation | Create a migrateFile |
| `useUpdateMigrateFileMutation` | Mutation | Update a migrateFile |
| `useDeleteMigrateFileMutation` | Mutation | Delete a migrateFile |
| `useNodeTypeRegistriesQuery` | Query | List all nodeTypeRegistries |
| `useNodeTypeRegistryQuery` | Query | Get one nodeTypeRegistry |
| `useCreateNodeTypeRegistryMutation` | Mutation | Create a nodeTypeRegistry |
| `useUpdateNodeTypeRegistryMutation` | Mutation | Update a nodeTypeRegistry |
| `useDeleteNodeTypeRegistryMutation` | Mutation | Delete a nodeTypeRegistry |
| `usePubkeySettingsQuery` | Query | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `usePubkeySettingQuery` | Query | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useCreatePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useUpdatePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useDeletePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useDatabasesQuery` | Query | List all databases |
| `useDatabaseQuery` | Query | Get one database |
| `useCreateDatabaseMutation` | Mutation | Create a database |
| `useUpdateDatabaseMutation` | Mutation | Update a database |
| `useDeleteDatabaseMutation` | Mutation | Delete a database |
| `useRlsSettingsQuery` | Query | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useRlsSettingQuery` | Query | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useCreateRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useUpdateRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useDeleteRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useSqlActionsQuery` | Query | List all sqlActions |
| `useSqlActionQuery` | Query | Get one sqlAction |
| `useCreateSqlActionMutation` | Mutation | Create a sqlAction |
| `useUpdateSqlActionMutation` | Mutation | Update a sqlAction |
| `useDeleteSqlActionMutation` | Mutation | Delete a sqlAction |
| `useDatabaseSettingsQuery` | Query | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useDatabaseSettingQuery` | Query | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useCreateDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useUpdateDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useDeleteDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useWebauthnSettingsQuery` | Query | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useWebauthnSettingQuery` | Query | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useCreateWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useUpdateWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useDeleteWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useAstMigrationsQuery` | Query | List all astMigrations |
| `useAstMigrationQuery` | Query | Get one astMigration |
| `useCreateAstMigrationMutation` | Mutation | Create a astMigration |
| `useUpdateAstMigrationMutation` | Mutation | Update a astMigration |
| `useDeleteAstMigrationMutation` | Mutation | Delete a astMigration |
| `useApplyRegistryDefaultsQuery` | Query | applyRegistryDefaults |
| `useAcceptDatabaseTransferMutation` | Mutation | acceptDatabaseTransfer |
| `useCancelDatabaseTransferMutation` | Mutation | cancelDatabaseTransfer |
| `useRejectDatabaseTransferMutation` | Mutation | rejectDatabaseTransfer |
| `useProvisionDatabaseWithUserMutation` | Mutation | provisionDatabaseWithUser |
| `useBootstrapUserMutation` | Mutation | bootstrapUser |
| `useSetFieldOrderMutation` | Mutation | setFieldOrder |
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
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

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
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});

// Get one field
const { data: item } = useFieldQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});

// Create a field
const { mutate: create } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', isRequired: '<Boolean>', apiRequired: '<Boolean>', defaultValue: '<JSON>', type: '<JSON>', fieldOrder: '<Int>', regexp: '<String>', chk: '<JSON>', chkExpr: '<JSON>', min: '<Float>', max: '<Float>', tags: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>' });
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
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, langColumn: true, createdAt: true, updatedAt: true } },
});

// Get one fullTextSearch
const { data: item } = useFullTextSearchQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, fieldIds: true, weights: true, langs: true, langColumn: true, createdAt: true, updatedAt: true } },
});

// Create a fullTextSearch
const { mutate: create } = useCreateFullTextSearchMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', weights: '<String>', langs: '<String>', langColumn: '<String>' });
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

### Partition

```typescript
// List all partitions
const { data, isLoading } = usePartitionsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, isParented: true, createdAt: true, updatedAt: true } },
});

// Get one partition
const { data: item } = usePartitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, isParented: true, createdAt: true, updatedAt: true } },
});

// Create a partition
const { mutate: create } = useCreatePartitionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', tableId: '<UUID>', strategy: '<String>', partitionKeyId: '<UUID>', interval: '<String>', retention: '<String>', retentionKeepTable: '<Boolean>', premake: '<Int>', namingPattern: '<String>', isParented: '<Boolean>' });
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

### ApiSetting

```typescript
// List all apiSettings
const { data, isLoading } = useApiSettingsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } },
});

// Get one apiSetting
const { data: item } = useApiSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, apiId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } },
});

// Create a apiSetting
const { mutate: create } = useCreateApiSettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', apiId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', enableI18N: '<Boolean>', options: '<JSON>' });
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

### DatabaseSetting

```typescript
// List all databaseSettings
const { data, isLoading } = useDatabaseSettingsQuery({
  selection: { fields: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } },
});

// Get one databaseSetting
const { data: item } = useDatabaseSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, enableAggregates: true, enablePostgis: true, enableSearch: true, enableDirectUploads: true, enablePresignedUploads: true, enableManyToMany: true, enableConnectionFilter: true, enableLtree: true, enableLlm: true, enableRealtime: true, enableBulk: true, enableI18N: true, options: true } },
});

// Create a databaseSetting
const { mutate: create } = useCreateDatabaseSettingMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', enableI18N: '<Boolean>', options: '<JSON>' });
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

## Custom Operation Hooks

### `useApplyRegistryDefaultsQuery`

applyRegistryDefaults

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `nodeType` | String |
  | `data` | JSON |

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

### `useProvisionDatabaseWithUserMutation`

provisionDatabaseWithUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionDatabaseWithUserInput (required) |

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
