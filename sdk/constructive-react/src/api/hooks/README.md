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
| `useApisQuery` | Query | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useApiQuery` | Query | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useCreateApiMutation` | Mutation | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useUpdateApiMutation` | Mutation | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useDeleteApiMutation` | Mutation | API endpoint configurations: each record defines a PostGraphile/PostgREST API with its database role and public access settings |
| `useApiModulesQuery` | Query | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useApiModuleQuery` | Query | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useCreateApiModuleMutation` | Mutation | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useUpdateApiModuleMutation` | Mutation | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useDeleteApiModuleMutation` | Mutation | Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server |
| `useApiSchemasQuery` | Query | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useApiSchemaQuery` | Query | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useCreateApiSchemaMutation` | Mutation | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useUpdateApiSchemaMutation` | Mutation | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useDeleteApiSchemaMutation` | Mutation | Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API |
| `useApiSettingsQuery` | Query | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useApiSettingQuery` | Query | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useCreateApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useUpdateApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useDeleteApiSettingMutation` | Mutation | Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default |
| `useAppsQuery` | Query | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useAppQuery` | Query | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useCreateAppMutation` | Mutation | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useUpdateAppMutation` | Mutation | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useDeleteAppMutation` | Mutation | Mobile and native app configuration linked to a site, including store links and identifiers |
| `useAstMigrationsQuery` | Query | List all astMigrations |
| `useAstMigrationQuery` | Query | Get one astMigration |
| `useCreateAstMigrationMutation` | Mutation | Create a astMigration |
| `useUpdateAstMigrationMutation` | Mutation | Update a astMigration |
| `useDeleteAstMigrationMutation` | Mutation | Delete a astMigration |
| `useCheckConstraintsQuery` | Query | List all checkConstraints |
| `useCheckConstraintQuery` | Query | Get one checkConstraint |
| `useCreateCheckConstraintMutation` | Mutation | Create a checkConstraint |
| `useUpdateCheckConstraintMutation` | Mutation | Update a checkConstraint |
| `useDeleteCheckConstraintMutation` | Mutation | Delete a checkConstraint |
| `useCompositeTypesQuery` | Query | List all compositeTypes |
| `useCompositeTypeQuery` | Query | Get one compositeType |
| `useCreateCompositeTypeMutation` | Mutation | Create a compositeType |
| `useUpdateCompositeTypeMutation` | Mutation | Update a compositeType |
| `useDeleteCompositeTypeMutation` | Mutation | Delete a compositeType |
| `useCorsSettingsQuery` | Query | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useCorsSettingQuery` | Query | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useCreateCorsSettingMutation` | Mutation | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useUpdateCorsSettingMutation` | Mutation | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useDeleteCorsSettingMutation` | Mutation | Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries |
| `useDatabasesQuery` | Query | List all databases |
| `useDatabaseQuery` | Query | Get one database |
| `useCreateDatabaseMutation` | Mutation | Create a database |
| `useUpdateDatabaseMutation` | Mutation | Update a database |
| `useDeleteDatabaseMutation` | Mutation | Delete a database |
| `useDatabaseSettingsQuery` | Query | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useDatabaseSettingQuery` | Query | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useCreateDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useUpdateDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useDeleteDatabaseSettingMutation` | Mutation | Database-wide feature flags and settings; controls which platform features are available to all APIs in this database |
| `useDatabaseTransfersQuery` | Query | List all databaseTransfers |
| `useDatabaseTransferQuery` | Query | Get one databaseTransfer |
| `useCreateDatabaseTransferMutation` | Mutation | Create a databaseTransfer |
| `useUpdateDatabaseTransferMutation` | Mutation | Update a databaseTransfer |
| `useDeleteDatabaseTransferMutation` | Mutation | Delete a databaseTransfer |
| `useDefaultPrivilegesQuery` | Query | List all defaultPrivileges |
| `useDefaultPrivilegeQuery` | Query | Get one defaultPrivilege |
| `useCreateDefaultPrivilegeMutation` | Mutation | Create a defaultPrivilege |
| `useUpdateDefaultPrivilegeMutation` | Mutation | Update a defaultPrivilege |
| `useDeleteDefaultPrivilegeMutation` | Mutation | Delete a defaultPrivilege |
| `useDomainsQuery` | Query | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useDomainQuery` | Query | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useCreateDomainMutation` | Mutation | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useUpdateDomainMutation` | Mutation | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useDeleteDomainMutation` | Mutation | DNS domain and subdomain routing: maps hostnames to either an API endpoint or a site |
| `useDomainEventsQuery` | Query | Append-only audit trail of the domain verify->DNS->issue lifecycle, mirroring resource_events / cluster_events. One row per state transition emitted by the domain:* functions. |
| `useDomainEventQuery` | Query | Append-only audit trail of the domain verify->DNS->issue lifecycle, mirroring resource_events / cluster_events. One row per state transition emitted by the domain:* functions. |
| `useCreateDomainEventMutation` | Mutation | Append-only audit trail of the domain verify->DNS->issue lifecycle, mirroring resource_events / cluster_events. One row per state transition emitted by the domain:* functions. |
| `useUpdateDomainEventMutation` | Mutation | Append-only audit trail of the domain verify->DNS->issue lifecycle, mirroring resource_events / cluster_events. One row per state transition emitted by the domain:* functions. |
| `useDeleteDomainEventMutation` | Mutation | Append-only audit trail of the domain verify->DNS->issue lifecycle, mirroring resource_events / cluster_events. One row per state transition emitted by the domain:* functions. |
| `useDomainVerificationsQuery` | Query | One row per outstanding/completed ownership-verification challenge for a managed_domain. Holds the PUBLIC challenge the user must publish (e.g. a DNS TXT record value) — this is a verification token, NOT a secret. Entity-owned via owner_id and read/written through the AuthzEntityMembership scoped-module security path gated on manage_domains. |
| `useDomainVerificationQuery` | Query | One row per outstanding/completed ownership-verification challenge for a managed_domain. Holds the PUBLIC challenge the user must publish (e.g. a DNS TXT record value) — this is a verification token, NOT a secret. Entity-owned via owner_id and read/written through the AuthzEntityMembership scoped-module security path gated on manage_domains. |
| `useCreateDomainVerificationMutation` | Mutation | One row per outstanding/completed ownership-verification challenge for a managed_domain. Holds the PUBLIC challenge the user must publish (e.g. a DNS TXT record value) — this is a verification token, NOT a secret. Entity-owned via owner_id and read/written through the AuthzEntityMembership scoped-module security path gated on manage_domains. |
| `useUpdateDomainVerificationMutation` | Mutation | One row per outstanding/completed ownership-verification challenge for a managed_domain. Holds the PUBLIC challenge the user must publish (e.g. a DNS TXT record value) — this is a verification token, NOT a secret. Entity-owned via owner_id and read/written through the AuthzEntityMembership scoped-module security path gated on manage_domains. |
| `useDeleteDomainVerificationMutation` | Mutation | One row per outstanding/completed ownership-verification challenge for a managed_domain. Holds the PUBLIC challenge the user must publish (e.g. a DNS TXT record value) — this is a verification token, NOT a secret. Entity-owned via owner_id and read/written through the AuthzEntityMembership scoped-module security path gated on manage_domains. |
| `useEmbeddingChunksQuery` | Query | List all embeddingChunks |
| `useEmbeddingChunkQuery` | Query | Get one embeddingChunk |
| `useCreateEmbeddingChunkMutation` | Mutation | Create a embeddingChunk |
| `useUpdateEmbeddingChunkMutation` | Mutation | Update a embeddingChunk |
| `useDeleteEmbeddingChunkMutation` | Mutation | Delete a embeddingChunk |
| `useEnumsQuery` | Query | List all enums |
| `useEnumQuery` | Query | Get one enum |
| `useCreateEnumMutation` | Mutation | Create a enum |
| `useUpdateEnumMutation` | Mutation | Update a enum |
| `useDeleteEnumMutation` | Mutation | Delete a enum |
| `useExclusionConstraintsQuery` | Query | List all exclusionConstraints |
| `useExclusionConstraintQuery` | Query | Get one exclusionConstraint |
| `useCreateExclusionConstraintMutation` | Mutation | Create a exclusionConstraint |
| `useUpdateExclusionConstraintMutation` | Mutation | Update a exclusionConstraint |
| `useDeleteExclusionConstraintMutation` | Mutation | Delete a exclusionConstraint |
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
| `useFunctionsQuery` | Query | List all functions |
| `useFunctionQuery` | Query | Get one function |
| `useCreateFunctionMutation` | Mutation | Create a function |
| `useUpdateFunctionMutation` | Mutation | Update a function |
| `useDeleteFunctionMutation` | Mutation | Delete a function |
| `useHttpRoutesQuery` | Query | Request-time HTTP routing authority: registered domain plus path prefix and optional method to a typed target |
| `useHttpRouteQuery` | Query | Request-time HTTP routing authority: registered domain plus path prefix and optional method to a typed target |
| `useCreateHttpRouteMutation` | Mutation | Request-time HTTP routing authority: registered domain plus path prefix and optional method to a typed target |
| `useUpdateHttpRouteMutation` | Mutation | Request-time HTTP routing authority: registered domain plus path prefix and optional method to a typed target |
| `useDeleteHttpRouteMutation` | Mutation | Request-time HTTP routing authority: registered domain plus path prefix and optional method to a typed target |
| `useIndicesQuery` | Query | List all indices |
| `useIndexQuery` | Query | Get one index |
| `useCreateIndexMutation` | Mutation | Create a index |
| `useUpdateIndexMutation` | Mutation | Update a index |
| `useDeleteIndexMutation` | Mutation | Delete a index |
| `useManagedDomainsQuery` | Query | One row per cert-bearing host or wildcard; tracks domain verification and TLS provisioning independently of services_public.domains. Reconcilers match a route's root domain to a row here by string (no FK/coupling in v1) |
| `useManagedDomainQuery` | Query | One row per cert-bearing host or wildcard; tracks domain verification and TLS provisioning independently of services_public.domains. Reconcilers match a route's root domain to a row here by string (no FK/coupling in v1) |
| `useCreateManagedDomainMutation` | Mutation | One row per cert-bearing host or wildcard; tracks domain verification and TLS provisioning independently of services_public.domains. Reconcilers match a route's root domain to a row here by string (no FK/coupling in v1) |
| `useUpdateManagedDomainMutation` | Mutation | One row per cert-bearing host or wildcard; tracks domain verification and TLS provisioning independently of services_public.domains. Reconcilers match a route's root domain to a row here by string (no FK/coupling in v1) |
| `useDeleteManagedDomainMutation` | Mutation | One row per cert-bearing host or wildcard; tracks domain verification and TLS provisioning independently of services_public.domains. Reconcilers match a route's root domain to a row here by string (no FK/coupling in v1) |
| `useNodeTypeRegistriesQuery` | Query | List all nodeTypeRegistries |
| `useNodeTypeRegistryQuery` | Query | Get one nodeTypeRegistry |
| `useCreateNodeTypeRegistryMutation` | Mutation | Create a nodeTypeRegistry |
| `useUpdateNodeTypeRegistryMutation` | Mutation | Update a nodeTypeRegistry |
| `useDeleteNodeTypeRegistryMutation` | Mutation | Delete a nodeTypeRegistry |
| `usePartitionsQuery` | Query | List all partitions |
| `usePartitionQuery` | Query | Get one partition |
| `useCreatePartitionMutation` | Mutation | Create a partition |
| `useUpdatePartitionMutation` | Mutation | Update a partition |
| `useDeletePartitionMutation` | Mutation | Delete a partition |
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
| `usePubkeySettingsQuery` | Query | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `usePubkeySettingQuery` | Query | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useCreatePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useUpdatePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useDeletePubkeySettingMutation` | Mutation | Per-database public-key crypto auth runtime configuration; typed replacement for api_modules pubkey_challenge JSONB entries |
| `useRlsSettingsQuery` | Query | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useRlsSettingQuery` | Query | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useCreateRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useUpdateRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useDeleteRlsSettingMutation` | Mutation | Per-database RLS module runtime configuration; typed replacement for api_modules rls_module JSONB entries |
| `useSchemasQuery` | Query | List all schemas |
| `useSchemaQuery` | Query | Get one schema |
| `useCreateSchemaMutation` | Mutation | Create a schema |
| `useUpdateSchemaMutation` | Mutation | Update a schema |
| `useDeleteSchemaMutation` | Mutation | Delete a schema |
| `useSchemaGrantsQuery` | Query | List all schemaGrants |
| `useSchemaGrantQuery` | Query | Get one schemaGrant |
| `useCreateSchemaGrantMutation` | Mutation | Create a schemaGrant |
| `useUpdateSchemaGrantMutation` | Mutation | Update a schemaGrant |
| `useDeleteSchemaGrantMutation` | Mutation | Delete a schemaGrant |
| `useSitesQuery` | Query | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useSiteQuery` | Query | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useCreateSiteMutation` | Mutation | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useUpdateSiteMutation` | Mutation | Top-level site configuration: branding assets, title, and description for a deployed application |
| `useDeleteSiteMutation` | Mutation | Top-level site configuration: branding assets, title, and description for a deployed application |
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
| `useSpatialRelationsQuery` | Query | List all spatialRelations |
| `useSpatialRelationQuery` | Query | Get one spatialRelation |
| `useCreateSpatialRelationMutation` | Mutation | Create a spatialRelation |
| `useUpdateSpatialRelationMutation` | Mutation | Update a spatialRelation |
| `useDeleteSpatialRelationMutation` | Mutation | Delete a spatialRelation |
| `useSqlActionsQuery` | Query | List all sqlActions |
| `useSqlActionQuery` | Query | Get one sqlAction |
| `useCreateSqlActionMutation` | Mutation | Create a sqlAction |
| `useUpdateSqlActionMutation` | Mutation | Update a sqlAction |
| `useDeleteSqlActionMutation` | Mutation | Delete a sqlAction |
| `useTablesQuery` | Query | List all tables |
| `useTableQuery` | Query | Get one table |
| `useCreateTableMutation` | Mutation | Create a table |
| `useUpdateTableMutation` | Mutation | Update a table |
| `useDeleteTableMutation` | Mutation | Delete a table |
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
| `useTriggerFunctionsQuery` | Query | List all triggerFunctions |
| `useTriggerFunctionQuery` | Query | Get one triggerFunction |
| `useCreateTriggerFunctionMutation` | Mutation | Create a triggerFunction |
| `useUpdateTriggerFunctionMutation` | Mutation | Update a triggerFunction |
| `useDeleteTriggerFunctionMutation` | Mutation | Delete a triggerFunction |
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
| `useViewTablesQuery` | Query | Junction table linking views to their joined tables for referential integrity |
| `useViewTableQuery` | Query | Junction table linking views to their joined tables for referential integrity |
| `useCreateViewTableMutation` | Mutation | Junction table linking views to their joined tables for referential integrity |
| `useUpdateViewTableMutation` | Mutation | Junction table linking views to their joined tables for referential integrity |
| `useDeleteViewTableMutation` | Mutation | Junction table linking views to their joined tables for referential integrity |
| `useWebauthnSettingsQuery` | Query | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useWebauthnSettingQuery` | Query | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useCreateWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useUpdateWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useDeleteWebauthnSettingMutation` | Mutation | Per-database WebAuthn/passkey runtime configuration; typed replacement for api_modules webauthn_challenge JSONB entries |
| `useApplyRegistryDefaultsQuery` | Query | applyRegistryDefaults |
| `useResolveHttpRouteQuery` | Query | resolveHttpRoute |
| `useAcceptDatabaseTransferMutation` | Mutation | acceptDatabaseTransfer |
| `useApplyRlsMutation` | Mutation | applyRls |
| `useCancelDatabaseTransferMutation` | Mutation | cancelDatabaseTransfer |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `useRejectDatabaseTransferMutation` | Mutation | rejectDatabaseTransfer |
| `useRequestDatabaseMutation` | Mutation | Requests a database and returns a ticket (database_provision_module row) to poll.

Pass exactly one of preset_slug or modules. The pool, presets, and owner bootstrap are private implementation details: a warm pool hit fulfills the ticket immediately (fulfilled_at set, deferred owner bootstrap), otherwise the database is cold-provisioned asynchronously with exactly the requested modules. Poll the ticket until status = 'completed'; it then carries database_id and fulfilled_at.

Example usage:
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', preset_slug := 'full');
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', modules := '["users_module", "emails_module"]'::jsonb); |
| `useSetFieldOrderMutation` | Mutation | setFieldOrder |

## Table Hooks

### Api

```typescript
// List all apis
const { data, isLoading } = useApisQuery({
  selection: { fields: { annotations: true, anonRole: true, databaseId: true, dbname: true, id: true, isPublic: true, labels: true, name: true, roleName: true } },
});

// Get one api
const { data: item } = useApiQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, anonRole: true, databaseId: true, dbname: true, id: true, isPublic: true, labels: true, name: true, roleName: true } },
});

// Create a api
const { mutate: create } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', anonRole: '<String>', databaseId: '<UUID>', dbname: '<String>', isPublic: '<Boolean>', labels: '<JSON>', name: '<String>', roleName: '<String>' });
```

### ApiModule

```typescript
// List all apiModules
const { data, isLoading } = useApiModulesQuery({
  selection: { fields: { apiId: true, data: true, databaseId: true, id: true, name: true } },
});

// Get one apiModule
const { data: item } = useApiModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiId: true, data: true, databaseId: true, id: true, name: true } },
});

// Create a apiModule
const { mutate: create } = useCreateApiModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiId: '<UUID>', data: '<JSON>', databaseId: '<UUID>', name: '<String>' });
```

### ApiSchema

```typescript
// List all apiSchemas
const { data, isLoading } = useApiSchemasQuery({
  selection: { fields: { apiId: true, databaseId: true, id: true, schemaId: true } },
});

// Get one apiSchema
const { data: item } = useApiSchemaQuery({
  id: '<UUID>',
  selection: { fields: { apiId: true, databaseId: true, id: true, schemaId: true } },
});

// Create a apiSchema
const { mutate: create } = useCreateApiSchemaMutation({
  selection: { fields: { id: true } },
});
create({ apiId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>' });
```

### ApiSetting

```typescript
// List all apiSettings
const { data, isLoading } = useApiSettingsQuery({
  selection: { fields: { apiId: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true } },
});

// Get one apiSetting
const { data: item } = useApiSettingQuery({
  id: '<UUID>',
  selection: { fields: { apiId: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, options: true } },
});

// Create a apiSetting
const { mutate: create } = useCreateApiSettingMutation({
  selection: { fields: { id: true } },
});
create({ apiId: '<UUID>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', options: '<JSON>' });
```

### App

```typescript
// List all apps
const { data, isLoading } = useAppsQuery({
  selection: { fields: { appIdPrefix: true, appImage: true, appStoreId: true, appStoreLink: true, databaseId: true, id: true, name: true, playStoreLink: true, siteId: true } },
});

// Get one app
const { data: item } = useAppQuery({
  id: '<UUID>',
  selection: { fields: { appIdPrefix: true, appImage: true, appStoreId: true, appStoreLink: true, databaseId: true, id: true, name: true, playStoreLink: true, siteId: true } },
});

// Create a app
const { mutate: create } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
create({ appIdPrefix: '<String>', appImage: '<Image>', appStoreId: '<String>', appStoreLink: '<Url>', databaseId: '<UUID>', name: '<String>', playStoreLink: '<Url>', siteId: '<UUID>' });
```

### AstMigration

```typescript
// List all astMigrations
const { data, isLoading } = useAstMigrationsQuery({
  selection: { fields: { actionId: true, actionName: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } },
});

// Get one astMigration
const { data: item } = useAstMigrationQuery({
  id: '<Int>',
  selection: { fields: { actionId: true, actionName: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } },
});

// Create a astMigration
const { mutate: create } = useCreateAstMigrationMutation({
  selection: { fields: { id: true } },
});
create({ actionId: '<UUID>', actionName: '<String>', actorId: '<UUID>', databaseId: '<UUID>', deploy: '<JSON>', deploys: '<String>', name: '<String>', payload: '<JSON>', requires: '<String>', revert: '<JSON>', verify: '<JSON>' });
```

### CheckConstraint

```typescript
// List all checkConstraints
const { data, isLoading } = useCheckConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, expr: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});

// Get one checkConstraint
const { data: item } = useCheckConstraintQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, databaseId: true, expr: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});

// Create a checkConstraint
const { mutate: create } = useCreateCheckConstraintMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', expr: '<JSON>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>' });
```

### CompositeType

```typescript
// List all compositeTypes
const { data, isLoading } = useCompositeTypesQuery({
  selection: { fields: { attributes: true, category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true } },
});

// Get one compositeType
const { data: item } = useCompositeTypeQuery({
  id: '<UUID>',
  selection: { fields: { attributes: true, category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true } },
});

// Create a compositeType
const { mutate: create } = useCreateCompositeTypeMutation({
  selection: { fields: { id: true } },
});
create({ attributes: '<JSON>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' });
```

### CorsSetting

```typescript
// List all corsSettings
const { data, isLoading } = useCorsSettingsQuery({
  selection: { fields: { allowedOrigins: true, apiId: true, databaseId: true, id: true } },
});

// Get one corsSetting
const { data: item } = useCorsSettingQuery({
  id: '<UUID>',
  selection: { fields: { allowedOrigins: true, apiId: true, databaseId: true, id: true } },
});

// Create a corsSetting
const { mutate: create } = useCreateCorsSettingMutation({
  selection: { fields: { id: true } },
});
create({ allowedOrigins: '<String>', apiId: '<UUID>', databaseId: '<UUID>' });
```

### Database

```typescript
// List all databases
const { data, isLoading } = useDatabasesQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, label: true, name: true, ownerId: true, platform: true, schemaHash: true, updatedAt: true } },
});

// Get one database
const { data: item } = useDatabaseQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, hash: true, id: true, label: true, name: true, ownerId: true, platform: true, schemaHash: true, updatedAt: true } },
});

// Create a database
const { mutate: create } = useCreateDatabaseMutation({
  selection: { fields: { id: true } },
});
create({ hash: '<UUID>', label: '<String>', name: '<String>', ownerId: '<UUID>', platform: '<Boolean>', schemaHash: '<String>' });
```

### DatabaseSetting

```typescript
// List all databaseSettings
const { data, isLoading } = useDatabaseSettingsQuery({
  selection: { fields: { annotations: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, labels: true, options: true } },
});

// Get one databaseSetting
const { data: item } = useDatabaseSettingQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, labels: true, options: true } },
});

// Create a databaseSetting
const { mutate: create } = useCreateDatabaseSettingMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', labels: '<JSON>', options: '<JSON>' });
```

### DatabaseTransfer

```typescript
// List all databaseTransfers
const { data, isLoading } = useDatabaseTransfersQuery({
  selection: { fields: { completedAt: true, createdAt: true, databaseId: true, expiresAt: true, id: true, initiatedBy: true, notes: true, sourceApproved: true, sourceApprovedAt: true, status: true, targetApproved: true, targetApprovedAt: true, targetOwnerId: true, updatedAt: true } },
});

// Get one databaseTransfer
const { data: item } = useDatabaseTransferQuery({
  id: '<UUID>',
  selection: { fields: { completedAt: true, createdAt: true, databaseId: true, expiresAt: true, id: true, initiatedBy: true, notes: true, sourceApproved: true, sourceApprovedAt: true, status: true, targetApproved: true, targetApprovedAt: true, targetOwnerId: true, updatedAt: true } },
});

// Create a databaseTransfer
const { mutate: create } = useCreateDatabaseTransferMutation({
  selection: { fields: { id: true } },
});
create({ completedAt: '<Datetime>', databaseId: '<UUID>', expiresAt: '<Datetime>', initiatedBy: '<UUID>', notes: '<String>', sourceApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', status: '<String>', targetApproved: '<Boolean>', targetApprovedAt: '<Datetime>', targetOwnerId: '<UUID>' });
```

### DefaultPrivilege

```typescript
// List all defaultPrivileges
const { data, isLoading } = useDefaultPrivilegesQuery({
  selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, objectType: true, privilege: true, schemaId: true } },
});

// Get one defaultPrivilege
const { data: item } = useDefaultPrivilegeQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, objectType: true, privilege: true, schemaId: true } },
});

// Create a defaultPrivilege
const { mutate: create } = useCreateDefaultPrivilegeMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', objectType: '<String>', privilege: '<String>', schemaId: '<UUID>' });
```

### Domain

```typescript
// List all domains
const { data, isLoading } = useDomainsQuery({
  selection: { fields: { annotations: true, apiId: true, databaseId: true, domain: true, id: true, labels: true, serviceId: true, siteId: true, subdomain: true } },
});

// Get one domain
const { data: item } = useDomainQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, apiId: true, databaseId: true, domain: true, id: true, labels: true, serviceId: true, siteId: true, subdomain: true } },
});

// Create a domain
const { mutate: create } = useCreateDomainMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', apiId: '<UUID>', databaseId: '<UUID>', domain: '<Hostname>', labels: '<JSON>', serviceId: '<UUID>', siteId: '<UUID>', subdomain: '<Hostname>' });
```

### DomainEvent

```typescript
// List all domainEvents
const { data, isLoading } = useDomainEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, ownerId: true } },
});

// Get one domainEvent
const { data: item } = useDomainEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, ownerId: true } },
});

// Create a domainEvent
const { mutate: create } = useCreateDomainEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>', ownerId: '<UUID>' });
```

### DomainVerification

```typescript
// List all domainVerifications
const { data, isLoading } = useDomainVerificationsQuery({
  selection: { fields: { attempts: true, createdAt: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, ownerId: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } },
});

// Get one domainVerification
const { data: item } = useDomainVerificationQuery({
  id: '<UUID>',
  selection: { fields: { attempts: true, createdAt: true, error: true, expiresAt: true, id: true, lastCheckedAt: true, managedDomainId: true, method: true, ownerId: true, recordName: true, recordType: true, recordValue: true, status: true, updatedAt: true, verifiedAt: true } },
});

// Create a domainVerification
const { mutate: create } = useCreateDomainVerificationMutation({
  selection: { fields: { id: true } },
});
create({ attempts: '<Int>', error: '<String>', expiresAt: '<Datetime>', lastCheckedAt: '<Datetime>', managedDomainId: '<UUID>', method: '<String>', ownerId: '<UUID>', recordName: '<String>', recordType: '<String>', recordValue: '<String>', status: '<String>', verifiedAt: '<Datetime>' });
```

### EmbeddingChunk

```typescript
// List all embeddingChunks
const { data, isLoading } = useEmbeddingChunksQuery({
  selection: { fields: { chunkOverlap: true, chunkSize: true, chunkStrategy: true, chunkingTaskName: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, createdAt: true, databaseId: true, dimensions: true, embeddingFieldId: true, embeddingModel: true, embeddingProvider: true, enqueueChunkingJob: true, id: true, metadataFields: true, metric: true, parentFkFieldId: true, searchIndexes: true, tableId: true, updatedAt: true } },
});

// Get one embeddingChunk
const { data: item } = useEmbeddingChunkQuery({
  id: '<UUID>',
  selection: { fields: { chunkOverlap: true, chunkSize: true, chunkStrategy: true, chunkingTaskName: true, chunksTableId: true, chunksTableName: true, contentFieldName: true, createdAt: true, databaseId: true, dimensions: true, embeddingFieldId: true, embeddingModel: true, embeddingProvider: true, enqueueChunkingJob: true, id: true, metadataFields: true, metric: true, parentFkFieldId: true, searchIndexes: true, tableId: true, updatedAt: true } },
});

// Create a embeddingChunk
const { mutate: create } = useCreateEmbeddingChunkMutation({
  selection: { fields: { id: true } },
});
create({ chunkOverlap: '<Int>', chunkSize: '<Int>', chunkStrategy: '<String>', chunkingTaskName: '<String>', chunksTableId: '<UUID>', chunksTableName: '<String>', contentFieldName: '<String>', databaseId: '<UUID>', dimensions: '<Int>', embeddingFieldId: '<UUID>', embeddingModel: '<String>', embeddingProvider: '<String>', enqueueChunkingJob: '<Boolean>', metadataFields: '<JSON>', metric: '<String>', parentFkFieldId: '<UUID>', searchIndexes: '<JSON>', tableId: '<UUID>' });
```

### Enum

```typescript
// List all enums
const { data, isLoading } = useEnumsQuery({
  selection: { fields: { category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true, values: true } },
});

// Get one enum
const { data: item } = useEnumQuery({
  id: '<UUID>',
  selection: { fields: { category: true, databaseId: true, description: true, id: true, label: true, name: true, schemaId: true, smartTags: true, tags: true, values: true } },
});

// Create a enum
const { mutate: create } = useCreateEnumMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>', values: '<String>' });
```

### ExclusionConstraint

```typescript
// List all exclusionConstraints
const { data, isLoading } = useExclusionConstraintsQuery({
  selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, elementExpr: true, fieldIds: true, id: true, name: true, operators: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, whereClause: true } },
});

// Get one exclusionConstraint
const { data: item } = useExclusionConstraintQuery({
  id: '<UUID>',
  selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, elementExpr: true, fieldIds: true, id: true, name: true, operators: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, whereClause: true } },
});

// Create a exclusionConstraint
const { mutate: create } = useCreateExclusionConstraintMutation({
  selection: { fields: { id: true } },
});
create({ accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', elementExpr: '<JSON>', fieldIds: '<UUID>', name: '<String>', operators: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', whereClause: '<JSON>' });
```

### Field

```typescript
// List all fields
const { data, isLoading } = useFieldsQuery({
  selection: { fields: { apiRequired: true, category: true, chk: true, chkExpr: true, createdAt: true, databaseId: true, defaultValue: true, description: true, fieldOrder: true, generationExpression: true, generationType: true, id: true, identityGeneration: true, identityOptions: true, isRequired: true, label: true, max: true, min: true, name: true, regexp: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});

// Get one field
const { data: item } = useFieldQuery({
  id: '<UUID>',
  selection: { fields: { apiRequired: true, category: true, chk: true, chkExpr: true, createdAt: true, databaseId: true, defaultValue: true, description: true, fieldOrder: true, generationExpression: true, generationType: true, id: true, identityGeneration: true, identityOptions: true, isRequired: true, label: true, max: true, min: true, name: true, regexp: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});

// Create a field
const { mutate: create } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
create({ apiRequired: '<Boolean>', category: '<ObjectCategory>', chk: '<JSON>', chkExpr: '<JSON>', databaseId: '<UUID>', defaultValue: '<JSON>', description: '<String>', fieldOrder: '<Int>', generationExpression: '<JSON>', generationType: '<String>', identityGeneration: '<String>', identityOptions: '<JSON>', isRequired: '<Boolean>', label: '<String>', max: '<Float>', min: '<Float>', name: '<String>', regexp: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<JSON>' });
```

### ForeignKeyConstraint

```typescript
// List all foreignKeyConstraints
const { data, isLoading } = useForeignKeyConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, deleteAction: true, deleteSetFieldIds: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, refFieldIds: true, refTableId: true, smartTags: true, tableId: true, tags: true, type: true, updateAction: true, updatedAt: true, withPeriod: true } },
});

// Get one foreignKeyConstraint
const { data: item } = useForeignKeyConstraintQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, databaseId: true, deleteAction: true, deleteSetFieldIds: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, refFieldIds: true, refTableId: true, smartTags: true, tableId: true, tags: true, type: true, updateAction: true, updatedAt: true, withPeriod: true } },
});

// Create a foreignKeyConstraint
const { mutate: create } = useCreateForeignKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', deleteAction: '<String>', deleteSetFieldIds: '<UUID>', description: '<String>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', refFieldIds: '<UUID>', refTableId: '<UUID>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', updateAction: '<String>', withPeriod: '<Boolean>' });
```

### FullTextSearch

```typescript
// List all fullTextSearches
const { data, isLoading } = useFullTextSearchesQuery({
  selection: { fields: { createdAt: true, databaseId: true, fieldId: true, fieldIds: true, id: true, langColumn: true, langs: true, tableId: true, updatedAt: true, weights: true } },
});

// Get one fullTextSearch
const { data: item } = useFullTextSearchQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, fieldId: true, fieldIds: true, id: true, langColumn: true, langs: true, tableId: true, updatedAt: true, weights: true } },
});

// Create a fullTextSearch
const { mutate: create } = useCreateFullTextSearchMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', langColumn: '<String>', langs: '<String>', tableId: '<UUID>', weights: '<String>' });
```

### Function

```typescript
// List all functions
const { data, isLoading } = useFunctionsQuery({
  selection: { fields: { databaseId: true, id: true, name: true, schemaId: true } },
});

// Get one function
const { data: item } = useFunctionQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true, name: true, schemaId: true } },
});

// Create a function
const { mutate: create } = useCreateFunctionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', schemaId: '<UUID>' });
```

### HttpRoute

```typescript
// List all httpRoutes
const { data, isLoading } = useHttpRoutesQuery({
  selection: { fields: { createdAt: true, createdBy: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetId: true, targetKind: true, updatedAt: true, updatedBy: true } },
});

// Get one httpRoute
const { data: item } = useHttpRouteQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, createdBy: true, databaseId: true, domainId: true, id: true, isActive: true, method: true, path: true, priority: true, targetId: true, targetKind: true, updatedAt: true, updatedBy: true } },
});

// Create a httpRoute
const { mutate: create } = useCreateHttpRouteMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetId: '<UUID>', targetKind: '<String>', updatedBy: '<UUID>' });
```

### Index

```typescript
// List all indices
const { data, isLoading } = useIndicesQuery({
  selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, includeFieldIds: true, indexParams: true, isUnique: true, name: true, opClasses: true, options: true, smartTags: true, tableId: true, tags: true, updatedAt: true, whereClause: true } },
});

// Get one index
const { data: item } = useIndexQuery({
  id: '<UUID>',
  selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, includeFieldIds: true, indexParams: true, isUnique: true, name: true, opClasses: true, options: true, smartTags: true, tableId: true, tags: true, updatedAt: true, whereClause: true } },
});

// Create a index
const { mutate: create } = useCreateIndexMutation({
  selection: { fields: { id: true } },
});
create({ accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', indexParams: '<JSON>', isUnique: '<Boolean>', name: '<String>', opClasses: '<String>', options: '<JSON>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', whereClause: '<JSON>' });
```

### ManagedDomain

```typescript
// List all managedDomains
const { data, isLoading } = useManagedDomainsQuery({
  selection: { fields: { allowPublicUsage: true, annotations: true, certStatus: true, databaseId: true, domain: true, id: true, isWildcard: true, tlsReadyAt: true, tlsStatus: true, verificationStatus: true, verifiedAt: true } },
});

// Get one managedDomain
const { data: item } = useManagedDomainQuery({
  id: '<UUID>',
  selection: { fields: { allowPublicUsage: true, annotations: true, certStatus: true, databaseId: true, domain: true, id: true, isWildcard: true, tlsReadyAt: true, tlsStatus: true, verificationStatus: true, verifiedAt: true } },
});

// Create a managedDomain
const { mutate: create } = useCreateManagedDomainMutation({
  selection: { fields: { id: true } },
});
create({ allowPublicUsage: '<Boolean>', annotations: '<JSON>', certStatus: '<String>', databaseId: '<UUID>', domain: '<Hostname>', isWildcard: '<Boolean>', tlsReadyAt: '<Datetime>', tlsStatus: '<String>', verificationStatus: '<String>', verifiedAt: '<Datetime>' });
```

### NodeTypeRegistry

```typescript
// List all nodeTypeRegistries
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { category: true, description: true, displayName: true, name: true, parameterSchema: true, slug: true, tags: true } },
});

// Get one nodeTypeRegistry
const { data: item } = useNodeTypeRegistryQuery({
  name: '<String>',
  selection: { fields: { category: true, description: true, displayName: true, name: true, parameterSchema: true, slug: true, tags: true } },
});

// Create a nodeTypeRegistry
const { mutate: create } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
create({ category: '<String>', description: '<String>', displayName: '<String>', parameterSchema: '<JSON>', slug: '<String>', tags: '<String>' });
```

### Partition

```typescript
// List all partitions
const { data, isLoading } = usePartitionsQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, interval: true, isParented: true, namingPattern: true, partitionKeyId: true, premake: true, retention: true, retentionKeepTable: true, strategy: true, tableId: true, updatedAt: true } },
});

// Get one partition
const { data: item } = usePartitionQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, id: true, interval: true, isParented: true, namingPattern: true, partitionKeyId: true, premake: true, retention: true, retentionKeepTable: true, strategy: true, tableId: true, updatedAt: true } },
});

// Create a partition
const { mutate: create } = useCreatePartitionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', interval: '<String>', isParented: '<Boolean>', namingPattern: '<String>', partitionKeyId: '<UUID>', premake: '<Int>', retention: '<String>', retentionKeepTable: '<Boolean>', strategy: '<String>', tableId: '<UUID>' });
```

### Policy

```typescript
// List all policies
const { data, isLoading } = usePoliciesQuery({
  selection: { fields: { category: true, createdAt: true, data: true, databaseId: true, disabled: true, granteeName: true, id: true, name: true, permissive: true, policyType: true, privilege: true, smartTags: true, tableId: true, tags: true, updatedAt: true, withCheck: true } },
});

// Get one policy
const { data: item } = usePolicyQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, data: true, databaseId: true, disabled: true, granteeName: true, id: true, name: true, permissive: true, policyType: true, privilege: true, smartTags: true, tableId: true, tags: true, updatedAt: true, withCheck: true } },
});

// Create a policy
const { mutate: create } = useCreatePolicyMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', disabled: '<Boolean>', granteeName: '<String>', name: '<String>', permissive: '<Boolean>', policyType: '<String>', privilege: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', withCheck: '<JSON>' });
```

### PrimaryKeyConstraint

```typescript
// List all primaryKeyConstraints
const { data, isLoading } = usePrimaryKeyConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } },
});

// Get one primaryKeyConstraint
const { data: item } = usePrimaryKeyConstraintQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } },
});

// Create a primaryKeyConstraint
const { mutate: create } = useCreatePrimaryKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', withoutOverlaps: '<Boolean>' });
```

### PubkeySetting

```typescript
// List all pubkeySettings
const { data, isLoading } = usePubkeySettingsQuery({
  selection: { fields: { cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, userField: true } },
});

// Get one pubkeySetting
const { data: item } = usePubkeySettingQuery({
  id: '<UUID>',
  selection: { fields: { cryptoNetwork: true, databaseId: true, id: true, schemaId: true, signInRecordFailureFunctionId: true, signInRequestChallengeFunctionId: true, signInWithChallengeFunctionId: true, signUpWithKeyFunctionId: true, userField: true } },
});

// Create a pubkeySetting
const { mutate: create } = useCreatePubkeySettingMutation({
  selection: { fields: { id: true } },
});
create({ cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', signInRecordFailureFunctionId: '<UUID>', signInRequestChallengeFunctionId: '<UUID>', signInWithChallengeFunctionId: '<UUID>', signUpWithKeyFunctionId: '<UUID>', userField: '<String>' });
```

### RlsSetting

```typescript
// List all rlsSettings
const { data, isLoading } = useRlsSettingsQuery({
  selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true } },
});

// Get one rlsSetting
const { data: item } = useRlsSettingQuery({
  id: '<UUID>',
  selection: { fields: { authenticateFunctionId: true, authenticateSchemaId: true, authenticateStrictFunctionId: true, currentIpAddressFunctionId: true, currentRoleFunctionId: true, currentRoleIdFunctionId: true, currentUserAgentFunctionId: true, databaseId: true, id: true, roleSchemaId: true } },
});

// Create a rlsSetting
const { mutate: create } = useCreateRlsSettingMutation({
  selection: { fields: { id: true } },
});
create({ authenticateFunctionId: '<UUID>', authenticateSchemaId: '<UUID>', authenticateStrictFunctionId: '<UUID>', currentIpAddressFunctionId: '<UUID>', currentRoleFunctionId: '<UUID>', currentRoleIdFunctionId: '<UUID>', currentUserAgentFunctionId: '<UUID>', databaseId: '<UUID>', roleSchemaId: '<UUID>' });
```

### Schema

```typescript
// List all schemas
const { data, isLoading } = useSchemasQuery({
  selection: { fields: { apiExposure: true, category: true, createdAt: true, databaseId: true, description: true, id: true, isPublic: true, label: true, name: true, schemaName: true, smartTags: true, tags: true, updatedAt: true } },
});

// Get one schema
const { data: item } = useSchemaQuery({
  id: '<UUID>',
  selection: { fields: { apiExposure: true, category: true, createdAt: true, databaseId: true, description: true, id: true, isPublic: true, label: true, name: true, schemaName: true, smartTags: true, tags: true, updatedAt: true } },
});

// Create a schema
const { mutate: create } = useCreateSchemaMutation({
  selection: { fields: { id: true } },
});
create({ apiExposure: '<ApiExposureLevel>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', isPublic: '<Boolean>', label: '<String>', name: '<String>', schemaName: '<String>', smartTags: '<JSON>', tags: '<String>' });
```

### SchemaGrant

```typescript
// List all schemaGrants
const { data, isLoading } = useSchemaGrantsQuery({
  selection: { fields: { createdAt: true, databaseId: true, granteeName: true, id: true, schemaId: true, updatedAt: true } },
});

// Get one schemaGrant
const { data: item } = useSchemaGrantQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, granteeName: true, id: true, schemaId: true, updatedAt: true } },
});

// Create a schemaGrant
const { mutate: create } = useCreateSchemaGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', granteeName: '<String>', schemaId: '<UUID>' });
```

### Site

```typescript
// List all sites
const { data, isLoading } = useSitesQuery({
  selection: { fields: { annotations: true, appleTouchIcon: true, databaseId: true, dbname: true, description: true, favicon: true, id: true, labels: true, logo: true, ogImage: true, title: true } },
});

// Get one site
const { data: item } = useSiteQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, appleTouchIcon: true, databaseId: true, dbname: true, description: true, favicon: true, id: true, labels: true, logo: true, ogImage: true, title: true } },
});

// Create a site
const { mutate: create } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', appleTouchIcon: '<Image>', databaseId: '<UUID>', dbname: '<String>', description: '<String>', favicon: '<Attachment>', labels: '<JSON>', logo: '<Image>', ogImage: '<Image>', title: '<String>' });
```

### SiteMetadatum

```typescript
// List all siteMetadata
const { data, isLoading } = useSiteMetadataQuery({
  selection: { fields: { databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true } },
});

// Get one siteMetadatum
const { data: item } = useSiteMetadatumQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, description: true, id: true, ogImage: true, siteId: true, title: true } },
});

// Create a siteMetadatum
const { mutate: create } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', description: '<String>', ogImage: '<Image>', siteId: '<UUID>', title: '<String>' });
```

### SiteModule

```typescript
// List all siteModules
const { data, isLoading } = useSiteModulesQuery({
  selection: { fields: { data: true, databaseId: true, id: true, name: true, siteId: true } },
});

// Get one siteModule
const { data: item } = useSiteModuleQuery({
  id: '<UUID>',
  selection: { fields: { data: true, databaseId: true, id: true, name: true, siteId: true } },
});

// Create a siteModule
const { mutate: create } = useCreateSiteModuleMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', databaseId: '<UUID>', name: '<String>', siteId: '<UUID>' });
```

### SiteTheme

```typescript
// List all siteThemes
const { data, isLoading } = useSiteThemesQuery({
  selection: { fields: { databaseId: true, id: true, siteId: true, theme: true } },
});

// Get one siteTheme
const { data: item } = useSiteThemeQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true, siteId: true, theme: true } },
});

// Create a siteTheme
const { mutate: create } = useCreateSiteThemeMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', siteId: '<UUID>', theme: '<JSON>' });
```

### SpatialRelation

```typescript
// List all spatialRelations
const { data, isLoading } = useSpatialRelationsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, fieldId: true, id: true, name: true, operator: true, paramName: true, refFieldId: true, refTableId: true, tableId: true, tags: true, updatedAt: true } },
});

// Get one spatialRelation
const { data: item } = useSpatialRelationQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, databaseId: true, fieldId: true, id: true, name: true, operator: true, paramName: true, refFieldId: true, refTableId: true, tableId: true, tags: true, updatedAt: true } },
});

// Create a spatialRelation
const { mutate: create } = useCreateSpatialRelationMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', fieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', refFieldId: '<UUID>', refTableId: '<UUID>', tableId: '<UUID>', tags: '<String>' });
```

### SqlAction

```typescript
// List all sqlActions
const { data, isLoading } = useSqlActionsQuery({
  selection: { fields: { actionId: true, actionName: true, actorId: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } },
});

// Get one sqlAction
const { data: item } = useSqlActionQuery({
  id: '<Int>',
  selection: { fields: { actionId: true, actionName: true, actorId: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } },
});

// Create a sqlAction
const { mutate: create } = useCreateSqlActionMutation({
  selection: { fields: { id: true } },
});
create({ actionId: '<UUID>', actionName: '<String>', actorId: '<UUID>', content: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', name: '<String>', payload: '<JSON>', revert: '<String>', verify: '<String>' });
```

### Table

```typescript
// List all tables
const { data, isLoading } = useTablesQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, id: true, inheritsId: true, label: true, name: true, partitionKeyNames: true, partitionKeyTypes: true, partitionStrategy: true, partitioned: true, peoplestamps: true, pluralName: true, schemaId: true, singularName: true, smartTags: true, stepUp: true, tags: true, timestamps: true, updatedAt: true, useRls: true } },
});

// Get one table
const { data: item } = useTableQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, id: true, inheritsId: true, label: true, name: true, partitionKeyNames: true, partitionKeyTypes: true, partitionStrategy: true, partitioned: true, peoplestamps: true, pluralName: true, schemaId: true, singularName: true, smartTags: true, stepUp: true, tags: true, timestamps: true, updatedAt: true, useRls: true } },
});

// Create a table
const { mutate: create } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', inheritsId: '<UUID>', label: '<String>', name: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', partitionStrategy: '<String>', partitioned: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', schemaId: '<UUID>', singularName: '<String>', smartTags: '<JSON>', stepUp: '<JSON>', tags: '<String>', timestamps: '<Boolean>', useRls: '<Boolean>' });
```

### TableGrant

```typescript
// List all tableGrants
const { data, isLoading } = useTableGrantsQuery({
  selection: { fields: { createdAt: true, databaseId: true, fieldIds: true, granteeName: true, id: true, isGrant: true, privilege: true, tableId: true, updatedAt: true } },
});

// Get one tableGrant
const { data: item } = useTableGrantQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, fieldIds: true, granteeName: true, id: true, isGrant: true, privilege: true, tableId: true, updatedAt: true } },
});

// Create a tableGrant
const { mutate: create } = useCreateTableGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', fieldIds: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', privilege: '<String>', tableId: '<UUID>' });
```

### Trigger

```typescript
// List all triggers
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, functionName: true, id: true, name: true, smartTags: true, tableId: true, tags: true, updatedAt: true } },
});

// Get one trigger
const { data: item } = useTriggerQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, databaseId: true, event: true, functionName: true, id: true, name: true, smartTags: true, tableId: true, tags: true, updatedAt: true } },
});

// Create a trigger
const { mutate: create } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', event: '<String>', functionName: '<String>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>' });
```

### TriggerFunction

```typescript
// List all triggerFunctions
const { data, isLoading } = useTriggerFunctionsQuery({
  selection: { fields: { code: true, createdAt: true, databaseId: true, id: true, name: true, updatedAt: true } },
});

// Get one triggerFunction
const { data: item } = useTriggerFunctionQuery({
  id: '<UUID>',
  selection: { fields: { code: true, createdAt: true, databaseId: true, id: true, name: true, updatedAt: true } },
});

// Create a triggerFunction
const { mutate: create } = useCreateTriggerFunctionMutation({
  selection: { fields: { id: true } },
});
create({ code: '<String>', databaseId: '<UUID>', name: '<String>' });
```

### UniqueConstraint

```typescript
// List all uniqueConstraints
const { data, isLoading } = useUniqueConstraintsQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } },
});

// Get one uniqueConstraint
const { data: item } = useUniqueConstraintQuery({
  id: '<UUID>',
  selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, fieldIds: true, id: true, initiallyDeferred: true, isDeferrable: true, name: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true, withoutOverlaps: true } },
});

// Create a uniqueConstraint
const { mutate: create } = useCreateUniqueConstraintMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', withoutOverlaps: '<Boolean>' });
```

### View

```typescript
// List all views
const { data, isLoading } = useViewsQuery({
  selection: { fields: { category: true, checkOption: true, data: true, databaseId: true, filterData: true, filterType: true, id: true, isReadOnly: true, name: true, schemaId: true, securityBarrier: true, securityInvoker: true, smartTags: true, tableId: true, tags: true, viewType: true } },
});

// Get one view
const { data: item } = useViewQuery({
  id: '<UUID>',
  selection: { fields: { category: true, checkOption: true, data: true, databaseId: true, filterData: true, filterType: true, id: true, isReadOnly: true, name: true, schemaId: true, securityBarrier: true, securityInvoker: true, smartTags: true, tableId: true, tags: true, viewType: true } },
});

// Create a view
const { mutate: create } = useCreateViewMutation({
  selection: { fields: { id: true } },
});
create({ category: '<ObjectCategory>', checkOption: '<String>', data: '<JSON>', databaseId: '<UUID>', filterData: '<JSON>', filterType: '<String>', isReadOnly: '<Boolean>', name: '<String>', schemaId: '<UUID>', securityBarrier: '<Boolean>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', viewType: '<String>' });
```

### ViewGrant

```typescript
// List all viewGrants
const { data, isLoading } = useViewGrantsQuery({
  selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, privilege: true, viewId: true, withGrantOption: true } },
});

// Get one viewGrant
const { data: item } = useViewGrantQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, privilege: true, viewId: true, withGrantOption: true } },
});

// Create a viewGrant
const { mutate: create } = useCreateViewGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', privilege: '<String>', viewId: '<UUID>', withGrantOption: '<Boolean>' });
```

### ViewRule

```typescript
// List all viewRules
const { data, isLoading } = useViewRulesQuery({
  selection: { fields: { action: true, databaseId: true, event: true, id: true, name: true, viewId: true } },
});

// Get one viewRule
const { data: item } = useViewRuleQuery({
  id: '<UUID>',
  selection: { fields: { action: true, databaseId: true, event: true, id: true, name: true, viewId: true } },
});

// Create a viewRule
const { mutate: create } = useCreateViewRuleMutation({
  selection: { fields: { id: true } },
});
create({ action: '<String>', databaseId: '<UUID>', event: '<String>', name: '<String>', viewId: '<UUID>' });
```

### ViewTable

```typescript
// List all viewTables
const { data, isLoading } = useViewTablesQuery({
  selection: { fields: { databaseId: true, id: true, joinOrder: true, tableId: true, viewId: true } },
});

// Get one viewTable
const { data: item } = useViewTableQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true, joinOrder: true, tableId: true, viewId: true } },
});

// Create a viewTable
const { mutate: create } = useCreateViewTableMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', joinOrder: '<Int>', tableId: '<UUID>', viewId: '<UUID>' });
```

### WebauthnSetting

```typescript
// List all webauthnSettings
const { data, isLoading } = useWebauthnSettingsQuery({
  selection: { fields: { attestationType: true, challengeExpirySeconds: true, credentialsSchemaId: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsSchemaId: true, sessionSecretsTableId: true, sessionsSchemaId: true, sessionsTableId: true, userFieldId: true } },
});

// Get one webauthnSetting
const { data: item } = useWebauthnSettingQuery({
  id: '<UUID>',
  selection: { fields: { attestationType: true, challengeExpirySeconds: true, credentialsSchemaId: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsSchemaId: true, sessionSecretsTableId: true, sessionsSchemaId: true, sessionsTableId: true, userFieldId: true } },
});

// Create a webauthnSetting
const { mutate: create } = useCreateWebauthnSettingMutation({
  selection: { fields: { id: true } },
});
create({ attestationType: '<String>', challengeExpirySeconds: '<BigInt>', credentialsSchemaId: '<UUID>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsSchemaId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsSchemaId: '<UUID>', sessionsTableId: '<UUID>', userFieldId: '<UUID>' });
```

## Custom Operation Hooks

### `useApplyRegistryDefaultsQuery`

applyRegistryDefaults

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `data` | JSON |
  | `nodeType` | String |

### `useResolveHttpRouteQuery`

resolveHttpRoute

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `requestHost` | String |
  | `requestMethod` | String |
  | `requestPath` | String |

### `useAcceptDatabaseTransferMutation`

acceptDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AcceptDatabaseTransferInput (required) |

### `useApplyRlsMutation`

applyRls

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ApplyRlsInput (required) |

### `useCancelDatabaseTransferMutation`

cancelDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CancelDatabaseTransferInput (required) |

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

### `useRejectDatabaseTransferMutation`

rejectDatabaseTransfer

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RejectDatabaseTransferInput (required) |

### `useRequestDatabaseMutation`

Requests a database and returns a ticket (database_provision_module row) to poll.

Pass exactly one of preset_slug or modules. The pool, presets, and owner bootstrap are private implementation details: a warm pool hit fulfills the ticket immediately (fulfilled_at set, deferred owner bootstrap), otherwise the database is cold-provisioned asynchronously with exactly the requested modules. Poll the ticket until status = 'completed'; it then carries database_id and fulfilled_at.

Example usage:
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', preset_slug := 'full');
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', modules := '["users_module", "emails_module"]'::jsonb);

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RequestDatabaseInput (required) |

### `useSetFieldOrderMutation`

setFieldOrder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetFieldOrderInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
