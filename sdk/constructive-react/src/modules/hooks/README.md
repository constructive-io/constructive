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
| `useAgentModulesQuery` | Query | List all agentModules |
| `useAgentModuleQuery` | Query | Get one agentModule |
| `useCreateAgentModuleMutation` | Mutation | Create a agentModule |
| `useUpdateAgentModuleMutation` | Mutation | Update a agentModule |
| `useDeleteAgentModuleMutation` | Mutation | Delete a agentModule |
| `useApiSurfaceModulesQuery` | Query | List all apiSurfaceModules |
| `useApiSurfaceModuleQuery` | Query | Get one apiSurfaceModule |
| `useCreateApiSurfaceModuleMutation` | Mutation | Create a apiSurfaceModule |
| `useUpdateApiSurfaceModuleMutation` | Mutation | Update a apiSurfaceModule |
| `useDeleteApiSurfaceModuleMutation` | Mutation | Delete a apiSurfaceModule |
| `useAppModulesQuery` | Query | List all appModules |
| `useAppModuleQuery` | Query | Get one appModule |
| `useCreateAppModuleMutation` | Mutation | Create a appModule |
| `useUpdateAppModuleMutation` | Mutation | Update a appModule |
| `useDeleteAppModuleMutation` | Mutation | Delete a appModule |
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
| `useBlueprintsQuery` | Query | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useBlueprintQuery` | Query | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useCreateBlueprintMutation` | Mutation | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useUpdateBlueprintMutation` | Mutation | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useDeleteBlueprintMutation` | Mutation | An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build. |
| `useBlueprintConstructionsQuery` | Query | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useBlueprintConstructionQuery` | Query | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useCreateBlueprintConstructionMutation` | Mutation | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useUpdateBlueprintConstructionMutation` | Mutation | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useDeleteBlueprintConstructionMutation` | Mutation | Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts. |
| `useBlueprintTemplatesQuery` | Query | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useBlueprintTemplateQuery` | Query | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useCreateBlueprintTemplateMutation` | Mutation | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useUpdateBlueprintTemplateMutation` | Mutation | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useDeleteBlueprintTemplateMutation` | Mutation | A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible). |
| `useCatalogModulesQuery` | Query | List all catalogModules |
| `useCatalogModuleQuery` | Query | Get one catalogModule |
| `useCreateCatalogModuleMutation` | Mutation | Create a catalogModule |
| `useUpdateCatalogModuleMutation` | Mutation | Update a catalogModule |
| `useDeleteCatalogModuleMutation` | Mutation | Delete a catalogModule |
| `useComputeLogModulesQuery` | Query | List all computeLogModules |
| `useComputeLogModuleQuery` | Query | Get one computeLogModule |
| `useCreateComputeLogModuleMutation` | Mutation | Create a computeLogModule |
| `useUpdateComputeLogModuleMutation` | Mutation | Update a computeLogModule |
| `useDeleteComputeLogModuleMutation` | Mutation | Delete a computeLogModule |
| `useConfigSecretsUserModulesQuery` | Query | List all configSecretsUserModules |
| `useConfigSecretsUserModuleQuery` | Query | Get one configSecretsUserModule |
| `useCreateConfigSecretsUserModuleMutation` | Mutation | Create a configSecretsUserModule |
| `useUpdateConfigSecretsUserModuleMutation` | Mutation | Update a configSecretsUserModule |
| `useDeleteConfigSecretsUserModuleMutation` | Mutation | Delete a configSecretsUserModule |
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
| `useDatabaseProvisionModulesQuery` | Query | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useDatabaseProvisionModuleQuery` | Query | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useCreateDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useUpdateDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useDeleteDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useDatabaseSettingsModulesQuery` | Query | List all databaseSettingsModules |
| `useDatabaseSettingsModuleQuery` | Query | Get one databaseSettingsModule |
| `useCreateDatabaseSettingsModuleMutation` | Mutation | Create a databaseSettingsModule |
| `useUpdateDatabaseSettingsModuleMutation` | Mutation | Update a databaseSettingsModule |
| `useDeleteDatabaseSettingsModuleMutation` | Mutation | Delete a databaseSettingsModule |
| `useDbPoolConfigsQuery` | Query | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useDbPoolConfigQuery` | Query | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useCreateDbPoolConfigMutation` | Mutation | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useUpdateDbPoolConfigMutation` | Mutation | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useDeleteDbPoolConfigMutation` | Mutation | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useDbPoolsQuery` | Query | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useDbPoolQuery` | Query | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useCreateDbPoolMutation` | Mutation | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useUpdateDbPoolMutation` | Mutation | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useDeleteDbPoolMutation` | Mutation | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useDbPresetModulesQuery` | Query | List all dbPresetModules |
| `useDbPresetModuleQuery` | Query | Get one dbPresetModule |
| `useCreateDbPresetModuleMutation` | Mutation | Create a dbPresetModule |
| `useUpdateDbPresetModuleMutation` | Mutation | Update a dbPresetModule |
| `useDeleteDbPresetModuleMutation` | Mutation | Delete a dbPresetModule |
| `useDbUsageModulesQuery` | Query | List all dbUsageModules |
| `useDbUsageModuleQuery` | Query | Get one dbUsageModule |
| `useCreateDbUsageModuleMutation` | Mutation | Create a dbUsageModule |
| `useUpdateDbUsageModuleMutation` | Mutation | Update a dbUsageModule |
| `useDeleteDbUsageModuleMutation` | Mutation | Delete a dbUsageModule |
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
| `useDevicesModulesQuery` | Query | List all devicesModules |
| `useDevicesModuleQuery` | Query | Get one devicesModule |
| `useCreateDevicesModuleMutation` | Mutation | Create a devicesModule |
| `useUpdateDevicesModuleMutation` | Mutation | Update a devicesModule |
| `useDeleteDevicesModuleMutation` | Mutation | Delete a devicesModule |
| `useDomainModulesQuery` | Query | List all domainModules |
| `useDomainModuleQuery` | Query | Get one domainModule |
| `useCreateDomainModuleMutation` | Mutation | Create a domainModule |
| `useUpdateDomainModuleMutation` | Mutation | Update a domainModule |
| `useDeleteDomainModuleMutation` | Mutation | Delete a domainModule |
| `useEmailsModulesQuery` | Query | List all emailsModules |
| `useEmailsModuleQuery` | Query | Get one emailsModule |
| `useCreateEmailsModuleMutation` | Mutation | Create a emailsModule |
| `useUpdateEmailsModuleMutation` | Mutation | Update a emailsModule |
| `useDeleteEmailsModuleMutation` | Mutation | Delete a emailsModule |
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
| `useEventsModulesQuery` | Query | List all eventsModules |
| `useEventsModuleQuery` | Query | Get one eventsModule |
| `useCreateEventsModuleMutation` | Mutation | Create a eventsModule |
| `useUpdateEventsModuleMutation` | Mutation | Update a eventsModule |
| `useDeleteEventsModuleMutation` | Mutation | Delete a eventsModule |
| `useFunctionDeploymentModulesQuery` | Query | List all functionDeploymentModules |
| `useFunctionDeploymentModuleQuery` | Query | Get one functionDeploymentModule |
| `useCreateFunctionDeploymentModuleMutation` | Mutation | Create a functionDeploymentModule |
| `useUpdateFunctionDeploymentModuleMutation` | Mutation | Update a functionDeploymentModule |
| `useDeleteFunctionDeploymentModuleMutation` | Mutation | Delete a functionDeploymentModule |
| `useFunctionInvocationModulesQuery` | Query | List all functionInvocationModules |
| `useFunctionInvocationModuleQuery` | Query | Get one functionInvocationModule |
| `useCreateFunctionInvocationModuleMutation` | Mutation | Create a functionInvocationModule |
| `useUpdateFunctionInvocationModuleMutation` | Mutation | Update a functionInvocationModule |
| `useDeleteFunctionInvocationModuleMutation` | Mutation | Delete a functionInvocationModule |
| `useFunctionModulesQuery` | Query | List all functionModules |
| `useFunctionModuleQuery` | Query | Get one functionModule |
| `useCreateFunctionModuleMutation` | Mutation | Create a functionModule |
| `useUpdateFunctionModuleMutation` | Mutation | Update a functionModule |
| `useDeleteFunctionModuleMutation` | Mutation | Delete a functionModule |
| `useGraphExecutionModulesQuery` | Query | List all graphExecutionModules |
| `useGraphExecutionModuleQuery` | Query | Get one graphExecutionModule |
| `useCreateGraphExecutionModuleMutation` | Mutation | Create a graphExecutionModule |
| `useUpdateGraphExecutionModuleMutation` | Mutation | Update a graphExecutionModule |
| `useDeleteGraphExecutionModuleMutation` | Mutation | Delete a graphExecutionModule |
| `useGraphModulesQuery` | Query | List all graphModules |
| `useGraphModuleQuery` | Query | Get one graphModule |
| `useCreateGraphModuleMutation` | Mutation | Create a graphModule |
| `useUpdateGraphModuleMutation` | Mutation | Update a graphModule |
| `useDeleteGraphModuleMutation` | Mutation | Delete a graphModule |
| `useHierarchyModulesQuery` | Query | List all hierarchyModules |
| `useHierarchyModuleQuery` | Query | Get one hierarchyModule |
| `useCreateHierarchyModuleMutation` | Mutation | Create a hierarchyModule |
| `useUpdateHierarchyModuleMutation` | Mutation | Update a hierarchyModule |
| `useDeleteHierarchyModuleMutation` | Mutation | Delete a hierarchyModule |
| `useHttpRouteModulesQuery` | Query | List all httpRouteModules |
| `useHttpRouteModuleQuery` | Query | Get one httpRouteModule |
| `useCreateHttpRouteModuleMutation` | Mutation | Create a httpRouteModule |
| `useUpdateHttpRouteModuleMutation` | Mutation | Update a httpRouteModule |
| `useDeleteHttpRouteModuleMutation` | Mutation | Delete a httpRouteModule |
| `useI18nModulesQuery` | Query | List all i18nModules |
| `useI18NModuleQuery` | Query | Get one i18NModule |
| `useCreateI18NModuleMutation` | Mutation | Create a i18NModule |
| `useUpdateI18NModuleMutation` | Mutation | Update a i18NModule |
| `useDeleteI18NModuleMutation` | Mutation | Delete a i18NModule |
| `useIdentityProvidersModulesQuery` | Query | Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which internal_secrets_module table the rotate proc targets
     (app_secrets for app scope, platform_secrets for platform scope). When scope = database,
     the secrets table gets a database_id column.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → platform-wide, platform admin manages (generate:constructive)
       scope=database  → per-database infra, carries database_id |
| `useIdentityProvidersModuleQuery` | Query | Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which internal_secrets_module table the rotate proc targets
     (app_secrets for app scope, platform_secrets for platform scope). When scope = database,
     the secrets table gets a database_id column.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → platform-wide, platform admin manages (generate:constructive)
       scope=database  → per-database infra, carries database_id |
| `useCreateIdentityProvidersModuleMutation` | Mutation | Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which internal_secrets_module table the rotate proc targets
     (app_secrets for app scope, platform_secrets for platform scope). When scope = database,
     the secrets table gets a database_id column.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → platform-wide, platform admin manages (generate:constructive)
       scope=database  → per-database infra, carries database_id |
| `useUpdateIdentityProvidersModuleMutation` | Mutation | Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which internal_secrets_module table the rotate proc targets
     (app_secrets for app scope, platform_secrets for platform scope). When scope = database,
     the secrets table gets a database_id column.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → platform-wide, platform admin manages (generate:constructive)
       scope=database  → per-database infra, carries database_id |
| `useDeleteIdentityProvidersModuleMutation` | Mutation | Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which internal_secrets_module table the rotate proc targets
     (app_secrets for app scope, platform_secrets for platform scope). When scope = database,
     the secrets table gets a database_id column.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → platform-wide, platform admin manages (generate:constructive)
       scope=database  → per-database infra, carries database_id |
| `useInferenceLogModulesQuery` | Query | List all inferenceLogModules |
| `useInferenceLogModuleQuery` | Query | Get one inferenceLogModule |
| `useCreateInferenceLogModuleMutation` | Mutation | Create a inferenceLogModule |
| `useUpdateInferenceLogModuleMutation` | Mutation | Update a inferenceLogModule |
| `useDeleteInferenceLogModuleMutation` | Mutation | Delete a inferenceLogModule |
| `useInfraConfigModulesQuery` | Query | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useInfraConfigModuleQuery` | Query | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useCreateInfraConfigModuleMutation` | Mutation | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useUpdateInfraConfigModuleMutation` | Mutation | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useDeleteInfraConfigModuleMutation` | Mutation | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useInfraSecretsModulesQuery` | Query | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useInfraSecretsModuleQuery` | Query | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useCreateInfraSecretsModuleMutation` | Mutation | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useUpdateInfraSecretsModuleMutation` | Mutation | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useDeleteInfraSecretsModuleMutation` | Mutation | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useIntegrationProvidersModulesQuery` | Query | Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string. |
| `useIntegrationProvidersModuleQuery` | Query | Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string. |
| `useCreateIntegrationProvidersModuleMutation` | Mutation | Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string. |
| `useUpdateIntegrationProvidersModuleMutation` | Mutation | Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string. |
| `useDeleteIntegrationProvidersModuleMutation` | Mutation | Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string. |
| `useInternalSecretsModulesQuery` | Query | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useInternalSecretsModuleQuery` | Query | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useCreateInternalSecretsModuleMutation` | Mutation | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useUpdateInternalSecretsModuleMutation` | Mutation | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useDeleteInternalSecretsModuleMutation` | Mutation | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useInvitesModulesQuery` | Query | List all invitesModules |
| `useInvitesModuleQuery` | Query | Get one invitesModule |
| `useCreateInvitesModuleMutation` | Mutation | Create a invitesModule |
| `useUpdateInvitesModuleMutation` | Mutation | Update a invitesModule |
| `useDeleteInvitesModuleMutation` | Mutation | Delete a invitesModule |
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
| `useMerkleStoreModulesQuery` | Query | List all merkleStoreModules |
| `useMerkleStoreModuleQuery` | Query | Get one merkleStoreModule |
| `useCreateMerkleStoreModuleMutation` | Mutation | Create a merkleStoreModule |
| `useUpdateMerkleStoreModuleMutation` | Mutation | Update a merkleStoreModule |
| `useDeleteMerkleStoreModuleMutation` | Mutation | Delete a merkleStoreModule |
| `useNamespaceModulesQuery` | Query | List all namespaceModules |
| `useNamespaceModuleQuery` | Query | Get one namespaceModule |
| `useCreateNamespaceModuleMutation` | Mutation | Create a namespaceModule |
| `useUpdateNamespaceModuleMutation` | Mutation | Update a namespaceModule |
| `useDeleteNamespaceModuleMutation` | Mutation | Delete a namespaceModule |
| `useNotificationsModulesQuery` | Query | List all notificationsModules |
| `useNotificationsModuleQuery` | Query | Get one notificationsModule |
| `useCreateNotificationsModuleMutation` | Mutation | Create a notificationsModule |
| `useUpdateNotificationsModuleMutation` | Mutation | Update a notificationsModule |
| `useDeleteNotificationsModuleMutation` | Mutation | Delete a notificationsModule |
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
| `usePlansModulesQuery` | Query | List all plansModules |
| `usePlansModuleQuery` | Query | Get one plansModule |
| `useCreatePlansModuleMutation` | Mutation | Create a plansModule |
| `useUpdatePlansModuleMutation` | Mutation | Update a plansModule |
| `useDeletePlansModuleMutation` | Mutation | Delete a plansModule |
| `usePrincipalAuthModulesQuery` | Query | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `usePrincipalAuthModuleQuery` | Query | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useCreatePrincipalAuthModuleMutation` | Mutation | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useUpdatePrincipalAuthModuleMutation` | Mutation | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useDeletePrincipalAuthModuleMutation` | Mutation | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useProfilesModulesQuery` | Query | List all profilesModules |
| `useProfilesModuleQuery` | Query | Get one profilesModule |
| `useCreateProfilesModuleMutation` | Mutation | Create a profilesModule |
| `useUpdateProfilesModuleMutation` | Mutation | Update a profilesModule |
| `useDeleteProfilesModuleMutation` | Mutation | Delete a profilesModule |
| `useRateLimitMetersModulesQuery` | Query | List all rateLimitMetersModules |
| `useRateLimitMetersModuleQuery` | Query | Get one rateLimitMetersModule |
| `useCreateRateLimitMetersModuleMutation` | Mutation | Create a rateLimitMetersModule |
| `useUpdateRateLimitMetersModuleMutation` | Mutation | Update a rateLimitMetersModule |
| `useDeleteRateLimitMetersModuleMutation` | Mutation | Delete a rateLimitMetersModule |
| `useRateLimitsModulesQuery` | Query | List all rateLimitsModules |
| `useRateLimitsModuleQuery` | Query | Get one rateLimitsModule |
| `useCreateRateLimitsModuleMutation` | Mutation | Create a rateLimitsModule |
| `useUpdateRateLimitsModuleMutation` | Mutation | Update a rateLimitsModule |
| `useDeleteRateLimitsModuleMutation` | Mutation | Delete a rateLimitsModule |
| `useRealtimeModulesQuery` | Query | List all realtimeModules |
| `useRealtimeModuleQuery` | Query | Get one realtimeModule |
| `useCreateRealtimeModuleMutation` | Mutation | Create a realtimeModule |
| `useUpdateRealtimeModuleMutation` | Mutation | Update a realtimeModule |
| `useDeleteRealtimeModuleMutation` | Mutation | Delete a realtimeModule |
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
| `useResourceModulesQuery` | Query | List all resourceModules |
| `useResourceModuleQuery` | Query | Get one resourceModule |
| `useCreateResourceModuleMutation` | Mutation | Create a resourceModule |
| `useUpdateResourceModuleMutation` | Mutation | Update a resourceModule |
| `useDeleteResourceModuleMutation` | Mutation | Delete a resourceModule |
| `useRlsModulesQuery` | Query | List all rlsModules |
| `useRlsModuleQuery` | Query | Get one rlsModule |
| `useCreateRlsModuleMutation` | Mutation | Create a rlsModule |
| `useUpdateRlsModuleMutation` | Mutation | Update a rlsModule |
| `useDeleteRlsModuleMutation` | Mutation | Delete a rlsModule |
| `useRouteModulesQuery` | Query | List all routeModules |
| `useRouteModuleQuery` | Query | Get one routeModule |
| `useCreateRouteModuleMutation` | Mutation | Create a routeModule |
| `useUpdateRouteModuleMutation` | Mutation | Update a routeModule |
| `useDeleteRouteModuleMutation` | Mutation | Delete a routeModule |
| `useSecureTableProvisionsQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useSecureTableProvisionQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useCreateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useUpdateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useDeleteSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useSessionSecretsModulesQuery` | Query | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useSessionSecretsModuleQuery` | Query | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useCreateSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useUpdateSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useDeleteSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useSessionsModulesQuery` | Query | List all sessionsModules |
| `useSessionsModuleQuery` | Query | Get one sessionsModule |
| `useCreateSessionsModuleMutation` | Mutation | Create a sessionsModule |
| `useUpdateSessionsModuleMutation` | Mutation | Update a sessionsModule |
| `useDeleteSessionsModuleMutation` | Mutation | Delete a sessionsModule |
| `useSiteSurfaceModulesQuery` | Query | List all siteSurfaceModules |
| `useSiteSurfaceModuleQuery` | Query | Get one siteSurfaceModule |
| `useCreateSiteSurfaceModuleMutation` | Mutation | Create a siteSurfaceModule |
| `useUpdateSiteSurfaceModuleMutation` | Mutation | Update a siteSurfaceModule |
| `useDeleteSiteSurfaceModuleMutation` | Mutation | Delete a siteSurfaceModule |
| `useStorageLogModulesQuery` | Query | List all storageLogModules |
| `useStorageLogModuleQuery` | Query | Get one storageLogModule |
| `useCreateStorageLogModuleMutation` | Mutation | Create a storageLogModule |
| `useUpdateStorageLogModuleMutation` | Mutation | Update a storageLogModule |
| `useDeleteStorageLogModuleMutation` | Mutation | Delete a storageLogModule |
| `useStorageModulesQuery` | Query | List all storageModules |
| `useStorageModuleQuery` | Query | Get one storageModule |
| `useCreateStorageModuleMutation` | Mutation | Create a storageModule |
| `useUpdateStorageModuleMutation` | Mutation | Update a storageModule |
| `useDeleteStorageModuleMutation` | Mutation | Delete a storageModule |
| `useTransferLogModulesQuery` | Query | List all transferLogModules |
| `useTransferLogModuleQuery` | Query | Get one transferLogModule |
| `useCreateTransferLogModuleMutation` | Mutation | Create a transferLogModule |
| `useUpdateTransferLogModuleMutation` | Mutation | Update a transferLogModule |
| `useDeleteTransferLogModuleMutation` | Mutation | Delete a transferLogModule |
| `useUserAuthModulesQuery` | Query | List all userAuthModules |
| `useUserAuthModuleQuery` | Query | Get one userAuthModule |
| `useCreateUserAuthModuleMutation` | Mutation | Create a userAuthModule |
| `useUpdateUserAuthModuleMutation` | Mutation | Update a userAuthModule |
| `useDeleteUserAuthModuleMutation` | Mutation | Delete a userAuthModule |
| `useUserCredentialsModulesQuery` | Query | Per-user bcrypt credential store (password hashes, API key hashes).
     Always user-scoped with AuthzDirectOwner RLS. Consumed by user_auth_module,
     identity_providers_module, and bootstrap procedures. |
| `useUserCredentialsModuleQuery` | Query | Per-user bcrypt credential store (password hashes, API key hashes).
     Always user-scoped with AuthzDirectOwner RLS. Consumed by user_auth_module,
     identity_providers_module, and bootstrap procedures. |
| `useCreateUserCredentialsModuleMutation` | Mutation | Per-user bcrypt credential store (password hashes, API key hashes).
     Always user-scoped with AuthzDirectOwner RLS. Consumed by user_auth_module,
     identity_providers_module, and bootstrap procedures. |
| `useUpdateUserCredentialsModuleMutation` | Mutation | Per-user bcrypt credential store (password hashes, API key hashes).
     Always user-scoped with AuthzDirectOwner RLS. Consumed by user_auth_module,
     identity_providers_module, and bootstrap procedures. |
| `useDeleteUserCredentialsModuleMutation` | Mutation | Per-user bcrypt credential store (password hashes, API key hashes).
     Always user-scoped with AuthzDirectOwner RLS. Consumed by user_auth_module,
     identity_providers_module, and bootstrap procedures. |
| `useUserSettingsModulesQuery` | Query | List all userSettingsModules |
| `useUserSettingsModuleQuery` | Query | Get one userSettingsModule |
| `useCreateUserSettingsModuleMutation` | Mutation | Create a userSettingsModule |
| `useUpdateUserSettingsModuleMutation` | Mutation | Update a userSettingsModule |
| `useDeleteUserSettingsModuleMutation` | Mutation | Delete a userSettingsModule |
| `useUserStateModulesQuery` | Query | List all userStateModules |
| `useUserStateModuleQuery` | Query | Get one userStateModule |
| `useCreateUserStateModuleMutation` | Mutation | Create a userStateModule |
| `useUpdateUserStateModuleMutation` | Mutation | Update a userStateModule |
| `useDeleteUserStateModuleMutation` | Mutation | Delete a userStateModule |
| `useUsersModulesQuery` | Query | List all usersModules |
| `useUsersModuleQuery` | Query | Get one usersModule |
| `useCreateUsersModuleMutation` | Mutation | Create a usersModule |
| `useUpdateUsersModuleMutation` | Mutation | Update a usersModule |
| `useDeleteUsersModuleMutation` | Mutation | Delete a usersModule |
| `useWebauthnAuthModulesQuery` | Query | List all webauthnAuthModules |
| `useWebauthnAuthModuleQuery` | Query | Get one webauthnAuthModule |
| `useCreateWebauthnAuthModuleMutation` | Mutation | Create a webauthnAuthModule |
| `useUpdateWebauthnAuthModuleMutation` | Mutation | Update a webauthnAuthModule |
| `useDeleteWebauthnAuthModuleMutation` | Mutation | Delete a webauthnAuthModule |
| `useWebauthnCredentialsModulesQuery` | Query | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useWebauthnCredentialsModuleQuery` | Query | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useCreateWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useUpdateWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useDeleteWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useWebhookModulesQuery` | Query | List all webhookModules |
| `useWebhookModuleQuery` | Query | Get one webhookModule |
| `useCreateWebhookModuleMutation` | Mutation | Create a webhookModule |
| `useUpdateWebhookModuleMutation` | Mutation | Update a webhookModule |
| `useDeleteWebhookModuleMutation` | Mutation | Delete a webhookModule |
| `useResolveBlueprintFieldQuery` | Query | Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this. |
| `useResolveBlueprintTableQuery` | Query | Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error. |
| `useConstructBlueprintMutation` | Mutation | Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When function_module is installed, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure. |
| `useCopyTemplateToBlueprintMutation` | Mutation | Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID. |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `useProvisionCheckConstraintMutation` | Mutation | Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists. |
| `useProvisionFullTextSearchMutation` | Mutation | Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id. |
| `useProvisionIndexMutation` | Mutation | Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id. |
| `useProvisionRelationMutation` | Mutation | Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id). |
| `useProvisionSpatialRelationMutation` | Mutation | Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert. |
| `useProvisionTableMutation` | Mutation | Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields). |
| `useProvisionUniqueConstraintMutation` | Mutation | Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists. |

## Table Hooks

### AgentModule

```typescript
// List all agentModules
const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { agentTableId: true, agentTableName: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, hasAgents: true, hasPlans: true, hasResources: true, id: true, messageTableId: true, messageTableName: true, personaTableId: true, personaTableName: true, planTableId: true, planTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, promptsTableId: true, promptsTableName: true, provisions: true, publicSchemaName: true, resourceTableId: true, resourceTableName: true, resources: true, schemaId: true, scope: true, shared: true, taskTableId: true, taskTableName: true, threadTableId: true, threadTableName: true } },
});

// Get one agentModule
const { data: item } = useAgentModuleQuery({
  id: '<UUID>',
  selection: { fields: { agentTableId: true, agentTableName: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, hasAgents: true, hasPlans: true, hasResources: true, id: true, messageTableId: true, messageTableName: true, personaTableId: true, personaTableName: true, planTableId: true, planTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, promptsTableId: true, promptsTableName: true, provisions: true, publicSchemaName: true, resourceTableId: true, resourceTableName: true, resources: true, schemaId: true, scope: true, shared: true, taskTableId: true, taskTableName: true, threadTableId: true, threadTableName: true } },
});

// Create a agentModule
const { mutate: create } = useCreateAgentModuleMutation({
  selection: { fields: { id: true } },
});
create({ agentTableId: '<UUID>', agentTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasAgents: '<Boolean>', hasPlans: '<Boolean>', hasResources: '<Boolean>', messageTableId: '<UUID>', messageTableName: '<String>', personaTableId: '<UUID>', personaTableName: '<String>', planTableId: '<UUID>', planTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', promptsTableId: '<UUID>', promptsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceTableId: '<UUID>', resourceTableName: '<String>', resources: '<JSON>', schemaId: '<UUID>', scope: '<String>', shared: '<Boolean>', taskTableId: '<UUID>', taskTableName: '<String>', threadTableId: '<UUID>', threadTableName: '<String>' });
```

### ApiSurfaceModule

```typescript
// List all apiSurfaceModules
const { data, isLoading } = useApiSurfaceModulesQuery({
  selection: { fields: { apiModulesTableId: true, apiModulesTableName: true, apiName: true, apiSchemasTableId: true, apiSchemasTableName: true, apiSettingsTableId: true, apiSettingsTableName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, corsSettingsTableId: true, corsSettingsTableName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one apiSurfaceModule
const { data: item } = useApiSurfaceModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiModulesTableId: true, apiModulesTableName: true, apiName: true, apiSchemasTableId: true, apiSchemasTableName: true, apiSettingsTableId: true, apiSettingsTableName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, corsSettingsTableId: true, corsSettingsTableName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a apiSurfaceModule
const { mutate: create } = useCreateApiSurfaceModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiModulesTableId: '<UUID>', apiModulesTableName: '<String>', apiName: '<String>', apiSchemasTableId: '<UUID>', apiSchemasTableName: '<String>', apiSettingsTableId: '<UUID>', apiSettingsTableName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', catalogModuleId: '<UUID>', corsSettingsTableId: '<UUID>', corsSettingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### AppModule

```typescript
// List all appModules
const { data, isLoading } = useAppModulesQuery({
  selection: { fields: { apiName: true, appMembersTableId: true, appMembersTableName: true, appsTableId: true, appsTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one appModule
const { data: item } = useAppModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, appMembersTableId: true, appMembersTableName: true, appsTableId: true, appsTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a appModule
const { mutate: create } = useCreateAppModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', appMembersTableId: '<UUID>', appMembersTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### BillingModule

```typescript
// List all billingModules
const { data, isLoading } = useBillingModulesQuery({
  selection: { fields: { apiName: true, balancesTableId: true, balancesTableName: true, databaseId: true, defaultPermissions: true, id: true, ledgerTableId: true, ledgerTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordUsageFunction: true, rollupUsageSummaryFunction: true, schemaId: true, sweepExpiredSubscriptionsFunction: true } },
});

// Get one billingModule
const { data: item } = useBillingModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, balancesTableId: true, balancesTableName: true, databaseId: true, defaultPermissions: true, id: true, ledgerTableId: true, ledgerTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordUsageFunction: true, rollupUsageSummaryFunction: true, schemaId: true, sweepExpiredSubscriptionsFunction: true } },
});

// Create a billingModule
const { mutate: create } = useCreateBillingModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordUsageFunction: '<String>', rollupUsageSummaryFunction: '<String>', schemaId: '<UUID>', sweepExpiredSubscriptionsFunction: '<String>' });
```

### BillingProviderModule

```typescript
// List all billingProviderModules
const { data, isLoading } = useBillingProviderModulesQuery({
  selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, id: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, schemaId: true, subscriptionsTableId: true } },
});

// Get one billingProviderModule
const { data: item } = useBillingProviderModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, billingCustomersTableId: true, billingCustomersTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, databaseId: true, id: true, prefix: true, pricesTableId: true, privateApiName: true, privateSchemaId: true, processBillingEventFunction: true, productsTableId: true, provider: true, schemaId: true, subscriptionsTableId: true } },
});

// Create a billingProviderModule
const { mutate: create } = useCreateBillingProviderModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', databaseId: '<UUID>', prefix: '<String>', pricesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', processBillingEventFunction: '<String>', productsTableId: '<UUID>', provider: '<String>', schemaId: '<UUID>', subscriptionsTableId: '<UUID>' });
```

### Blueprint

```typescript
// List all blueprints
const { data, isLoading } = useBlueprintsQuery({
  selection: { fields: { createdAt: true, databaseId: true, definition: true, definitionHash: true, description: true, displayName: true, id: true, name: true, ownerId: true, tableHashes: true, templateId: true, updatedAt: true } },
});

// Get one blueprint
const { data: item } = useBlueprintQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, definition: true, definitionHash: true, description: true, displayName: true, id: true, name: true, ownerId: true, tableHashes: true, templateId: true, updatedAt: true } },
});

// Create a blueprint
const { mutate: create } = useCreateBlueprintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', definition: '<JSON>', definitionHash: '<UUID>', description: '<String>', displayName: '<String>', name: '<String>', ownerId: '<UUID>', tableHashes: '<JSON>', templateId: '<UUID>' });
```

### BlueprintConstruction

```typescript
// List all blueprintConstructions
const { data, isLoading } = useBlueprintConstructionsQuery({
  selection: { fields: { blueprintId: true, constructedAt: true, constructedDefinition: true, createdAt: true, databaseId: true, errorDetails: true, id: true, schemaId: true, status: true, tableMap: true, updatedAt: true } },
});

// Get one blueprintConstruction
const { data: item } = useBlueprintConstructionQuery({
  id: '<UUID>',
  selection: { fields: { blueprintId: true, constructedAt: true, constructedDefinition: true, createdAt: true, databaseId: true, errorDetails: true, id: true, schemaId: true, status: true, tableMap: true, updatedAt: true } },
});

// Create a blueprintConstruction
const { mutate: create } = useCreateBlueprintConstructionMutation({
  selection: { fields: { id: true } },
});
create({ blueprintId: '<UUID>', constructedAt: '<Datetime>', constructedDefinition: '<JSON>', databaseId: '<UUID>', errorDetails: '<String>', schemaId: '<UUID>', status: '<String>', tableMap: '<JSON>' });
```

### BlueprintTemplate

```typescript
// List all blueprintTemplates
const { data, isLoading } = useBlueprintTemplatesQuery({
  selection: { fields: { categories: true, complexity: true, copyCount: true, createdAt: true, definition: true, definitionHash: true, definitionSchemaVersion: true, description: true, displayName: true, forkCount: true, forkedFromId: true, id: true, name: true, ownerId: true, source: true, tableHashes: true, tags: true, updatedAt: true, version: true, visibility: true } },
});

// Get one blueprintTemplate
const { data: item } = useBlueprintTemplateQuery({
  id: '<UUID>',
  selection: { fields: { categories: true, complexity: true, copyCount: true, createdAt: true, definition: true, definitionHash: true, definitionSchemaVersion: true, description: true, displayName: true, forkCount: true, forkedFromId: true, id: true, name: true, ownerId: true, source: true, tableHashes: true, tags: true, updatedAt: true, version: true, visibility: true } },
});

// Create a blueprintTemplate
const { mutate: create } = useCreateBlueprintTemplateMutation({
  selection: { fields: { id: true } },
});
create({ categories: '<String>', complexity: '<String>', copyCount: '<Int>', definition: '<JSON>', definitionHash: '<UUID>', definitionSchemaVersion: '<String>', description: '<String>', displayName: '<String>', forkCount: '<Int>', forkedFromId: '<UUID>', name: '<String>', ownerId: '<UUID>', source: '<String>', tableHashes: '<JSON>', tags: '<String>', version: '<String>', visibility: '<String>' });
```

### CatalogModule

```typescript
// List all catalogModules
const { data, isLoading } = useCatalogModulesQuery({
  selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, appsTableId: true, appsTableName: true, databaseId: true, defaultPermissions: true, domainsTableId: true, domainsTableName: true, entityTableId: true, functionsTableId: true, functionsTableName: true, id: true, namespacesTableId: true, namespacesTableName: true, policies: true, privateApiName: true, provisions: true, publicSchemaName: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourcesTableId: true, resourcesTableName: true, schemaId: true, scope: true, sitesTableId: true, sitesTableName: true } },
});

// Get one catalogModule
const { data: item } = useCatalogModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, appsTableId: true, appsTableName: true, databaseId: true, defaultPermissions: true, domainsTableId: true, domainsTableName: true, entityTableId: true, functionsTableId: true, functionsTableName: true, id: true, namespacesTableId: true, namespacesTableName: true, policies: true, privateApiName: true, provisions: true, publicSchemaName: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourcesTableId: true, resourcesTableName: true, schemaId: true, scope: true, sitesTableId: true, sitesTableName: true } },
});

// Create a catalogModule
const { mutate: create } = useCreateCatalogModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityTableId: '<UUID>', functionsTableId: '<UUID>', functionsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', schemaId: '<UUID>', scope: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>' });
```

### ComputeLogModule

```typescript
// List all computeLogModules
const { data, isLoading } = useComputeLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Get one computeLogModule
const { data: item } = useComputeLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorFkTableId: true, apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Create a computeLogModule
const { mutate: create } = useCreateComputeLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorFkTableId: '<UUID>', apiName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```

### ConfigSecretsUserModule

```typescript
// List all configSecretsUserModules
const { data, isLoading } = useConfigSecretsUserModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one configSecretsUserModule
const { data: item } = useConfigSecretsUserModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a configSecretsUserModule
const { mutate: create } = useCreateConfigSecretsUserModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### ConnectedAccountsModule

```typescript
// List all connectedAccountsModules
const { data, isLoading } = useConnectedAccountsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one connectedAccountsModule
const { data: item } = useConnectedAccountsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a connectedAccountsModule
const { mutate: create } = useCreateConnectedAccountsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### CryptoAddressesModule

```typescript
// List all cryptoAddressesModules
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { apiName: true, cryptoNetwork: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one cryptoAddressesModule
const { data: item } = useCryptoAddressesModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, cryptoNetwork: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a cryptoAddressesModule
const { mutate: create } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', cryptoNetwork: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### CryptoAuthModule

```typescript
// List all cryptoAuthModules
const { data, isLoading } = useCryptoAuthModulesQuery({
  selection: { fields: { addressesTableId: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, secretsTableId: true, sessionCredentialsTableId: true, sessionsTableId: true, signInRecordFailure: true, signInRequestChallenge: true, signInWithChallenge: true, signUpWithKey: true, userField: true, usersTableId: true } },
});

// Get one cryptoAuthModule
const { data: item } = useCryptoAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { addressesTableId: true, cryptoNetwork: true, databaseId: true, id: true, schemaId: true, secretsTableId: true, sessionCredentialsTableId: true, sessionsTableId: true, signInRecordFailure: true, signInRequestChallenge: true, signInWithChallenge: true, signUpWithKey: true, userField: true, usersTableId: true } },
});

// Create a cryptoAuthModule
const { mutate: create } = useCreateCryptoAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ addressesTableId: '<UUID>', cryptoNetwork: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', secretsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', signInRecordFailure: '<String>', signInRequestChallenge: '<String>', signInWithChallenge: '<String>', signUpWithKey: '<String>', userField: '<String>', usersTableId: '<UUID>' });
```

### DatabaseProvisionModule

```typescript
// List all databaseProvisionModules
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { async: true, bootstrapError: true, bootstrapStatus: true, bootstrapUser: true, completedAt: true, createdAt: true, databaseId: true, databaseName: true, domain: true, errorMessage: true, fulfilledAt: true, id: true, modules: true, options: true, ownerId: true, sourceDatabaseId: true, status: true, subdomain: true, updatedAt: true } },
});

// Get one databaseProvisionModule
const { data: item } = useDatabaseProvisionModuleQuery({
  id: '<UUID>',
  selection: { fields: { async: true, bootstrapError: true, bootstrapStatus: true, bootstrapUser: true, completedAt: true, createdAt: true, databaseId: true, databaseName: true, domain: true, errorMessage: true, fulfilledAt: true, id: true, modules: true, options: true, ownerId: true, sourceDatabaseId: true, status: true, subdomain: true, updatedAt: true } },
});

// Create a databaseProvisionModule
const { mutate: create } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
create({ async: '<Boolean>', bootstrapError: '<String>', bootstrapStatus: '<String>', bootstrapUser: '<Boolean>', completedAt: '<Datetime>', databaseId: '<UUID>', databaseName: '<String>', domain: '<String>', errorMessage: '<String>', fulfilledAt: '<Datetime>', modules: '<JSON>', options: '<JSON>', ownerId: '<UUID>', sourceDatabaseId: '<UUID>', status: '<String>', subdomain: '<String>' });
```

### DatabaseSettingsModule

```typescript
// List all databaseSettingsModules
const { data, isLoading } = useDatabaseSettingsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, databaseSettingsTableId: true, databaseSettingsTableName: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, pubkeySettingsTableId: true, pubkeySettingsTableName: true, publicSchemaName: true, rlsSettingsTableId: true, rlsSettingsTableName: true, schemaId: true, scope: true, webauthnSettingsTableId: true, webauthnSettingsTableName: true } },
});

// Get one databaseSettingsModule
const { data: item } = useDatabaseSettingsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, databaseSettingsTableId: true, databaseSettingsTableName: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, pubkeySettingsTableId: true, pubkeySettingsTableName: true, publicSchemaName: true, rlsSettingsTableId: true, rlsSettingsTableName: true, schemaId: true, scope: true, webauthnSettingsTableId: true, webauthnSettingsTableName: true } },
});

// Create a databaseSettingsModule
const { mutate: create } = useCreateDatabaseSettingsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', databaseSettingsTableId: '<UUID>', databaseSettingsTableName: '<String>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', pubkeySettingsTableId: '<UUID>', pubkeySettingsTableName: '<String>', publicSchemaName: '<String>', rlsSettingsTableId: '<UUID>', rlsSettingsTableName: '<String>', schemaId: '<UUID>', scope: '<String>', webauthnSettingsTableId: '<UUID>', webauthnSettingsTableName: '<String>' });
```

### DbPoolConfig

```typescript
// List all dbPoolConfigs
const { data, isLoading } = useDbPoolConfigsQuery({
  selection: { fields: { createdAt: true, domain: true, enabled: true, id: true, max: true, min: true, poolOwnerId: true, presetSlug: true, updatedAt: true, warmTtl: true } },
});

// Get one dbPoolConfig
const { data: item } = useDbPoolConfigQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, domain: true, enabled: true, id: true, max: true, min: true, poolOwnerId: true, presetSlug: true, updatedAt: true, warmTtl: true } },
});

// Create a dbPoolConfig
const { mutate: create } = useCreateDbPoolConfigMutation({
  selection: { fields: { id: true } },
});
create({ domain: '<String>', enabled: '<Boolean>', max: '<Int>', min: '<Int>', poolOwnerId: '<UUID>', presetSlug: '<String>', warmTtl: '<Interval>' });
```

### DbPool

```typescript
// List all dbPools
const { data, isLoading } = useDbPoolsQuery({
  selection: { fields: { bootstrapError: true, bootstrapStatus: true, claimedAt: true, claimedBy: true, createdAt: true, databaseId: true, errorMessage: true, expiresAt: true, id: true, presetCommitId: true, presetSlug: true, status: true, updatedAt: true } },
});

// Get one dbPool
const { data: item } = useDbPoolQuery({
  id: '<UUID>',
  selection: { fields: { bootstrapError: true, bootstrapStatus: true, claimedAt: true, claimedBy: true, createdAt: true, databaseId: true, errorMessage: true, expiresAt: true, id: true, presetCommitId: true, presetSlug: true, status: true, updatedAt: true } },
});

// Create a dbPool
const { mutate: create } = useCreateDbPoolMutation({
  selection: { fields: { id: true } },
});
create({ bootstrapError: '<String>', bootstrapStatus: '<String>', claimedAt: '<Datetime>', claimedBy: '<UUID>', databaseId: '<UUID>', errorMessage: '<String>', expiresAt: '<Datetime>', presetCommitId: '<UUID>', presetSlug: '<String>', status: '<String>' });
```

### DbPresetModule

```typescript
// List all dbPresetModules
const { data, isLoading } = useDbPresetModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, dbPresetsTableId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } },
});

// Get one dbPresetModule
const { data: item } = useDbPresetModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, dbPresetsTableId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } },
});

// Create a dbPresetModule
const { mutate: create } = useCreateDbPresetModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', dbPresetsTableId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' });
```

### DbUsageModule

```typescript
// List all dbUsageModules
const { data, isLoading } = useDbUsageModulesQuery({
  selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsSummaryTableId: true, queryStatsSummaryTableName: true, retention: true, rollupDbQueryStatsUsageSummaryFunction: true, rollupDbTableStatsUsageSummaryFunction: true, schemaId: true, scope: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsSummaryTableId: true, tableStatsSummaryTableName: true } },
});

// Get one dbUsageModule
const { data: item } = useDbUsageModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsSummaryTableId: true, queryStatsSummaryTableName: true, retention: true, rollupDbQueryStatsUsageSummaryFunction: true, rollupDbTableStatsUsageSummaryFunction: true, schemaId: true, scope: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsSummaryTableId: true, tableStatsSummaryTableName: true } },
});

// Create a dbUsageModule
const { mutate: create } = useCreateDbUsageModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', collectDbQueryStatsFunction: '<String>', collectDbTableStatsFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsSummaryTableId: '<UUID>', queryStatsSummaryTableName: '<String>', retention: '<String>', rollupDbQueryStatsUsageSummaryFunction: '<String>', rollupDbTableStatsUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsSummaryTableId: '<UUID>', tableStatsSummaryTableName: '<String>' });
```

### DefaultIdsModule

```typescript
// List all defaultIdsModules
const { data, isLoading } = useDefaultIdsModulesQuery({
  selection: { fields: { databaseId: true, id: true } },
});

// Get one defaultIdsModule
const { data: item } = useDefaultIdsModuleQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true } },
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
  selection: { fields: { databaseId: true, fieldId: true, funcName: true, funcOrder: true, id: true, refFieldId: true, refIds: true, refTableId: true, setIds: true, tableId: true, updateDefaults: true, useUpdates: true } },
});

// Get one denormalizedTableField
const { data: item } = useDenormalizedTableFieldQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, fieldId: true, funcName: true, funcOrder: true, id: true, refFieldId: true, refIds: true, refTableId: true, setIds: true, tableId: true, updateDefaults: true, useUpdates: true } },
});

// Create a denormalizedTableField
const { mutate: create } = useCreateDenormalizedTableFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', fieldId: '<UUID>', funcName: '<String>', funcOrder: '<Int>', refFieldId: '<UUID>', refIds: '<UUID>', refTableId: '<UUID>', setIds: '<UUID>', tableId: '<UUID>', updateDefaults: '<Boolean>', useUpdates: '<Boolean>' });
```

### DevicesModule

```typescript
// List all devicesModules
const { data, isLoading } = useDevicesModulesQuery({
  selection: { fields: { databaseId: true, deviceSettingsTableId: true, deviceSettingsTableName: true, id: true, schemaId: true, userDevicesTableId: true, userDevicesTableName: true } },
});

// Get one devicesModule
const { data: item } = useDevicesModuleQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, deviceSettingsTableId: true, deviceSettingsTableName: true, id: true, schemaId: true, userDevicesTableId: true, userDevicesTableName: true } },
});

// Create a devicesModule
const { mutate: create } = useCreateDevicesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', deviceSettingsTableId: '<UUID>', deviceSettingsTableName: '<String>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', userDevicesTableName: '<String>' });
```

### DomainModule

```typescript
// List all domainModules
const { data, isLoading } = useDomainModulesQuery({
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainEventsTableId: true, domainEventsTableName: true, domainVerificationsTableId: true, domainVerificationsTableName: true, domainsTableId: true, domainsTableName: true, entityField: true, entityTableId: true, id: true, managedDomainsTableId: true, managedDomainsTableName: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one domainModule
const { data: item } = useDomainModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainEventsTableId: true, domainEventsTableName: true, domainVerificationsTableId: true, domainVerificationsTableName: true, domainsTableId: true, domainsTableName: true, entityField: true, entityTableId: true, id: true, managedDomainsTableId: true, managedDomainsTableName: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a domainModule
const { mutate: create } = useCreateDomainModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainEventsTableId: '<UUID>', domainEventsTableName: '<String>', domainVerificationsTableId: '<UUID>', domainVerificationsTableName: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', managedDomainsTableId: '<UUID>', managedDomainsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### EmailsModule

```typescript
// List all emailsModules
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one emailsModule
const { data: item } = useEmailsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a emailsModule
const { mutate: create } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### EntityTypeProvision

```typescript
// List all entityTypeProvisions
const { data, isLoading } = useEntityTypeProvisionsQuery({
  selection: { fields: { agents: true, databaseId: true, description: true, functions: true, graphs: true, hasInviteAchievements: true, hasInvites: true, hasLevels: true, hasLimits: true, hasProfiles: true, id: true, isVisible: true, name: true, namespaces: true, outAgentModuleId: true, outBucketsTableId: true, outDefinitionsTableId: true, outEntityTableId: true, outEntityTableName: true, outExecutionLogsTableId: true, outFilesTableId: true, outFunctionModuleId: true, outGraphModuleId: true, outGraphsTableId: true, outInstalledModules: true, outInvitesModuleId: true, outInvocationsTableId: true, outMembershipType: true, outNamespaceEventsTableId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outPathSharesTableId: true, outStorageModuleId: true, parentEntity: true, prefix: true, skipEntityPolicies: true, storage: true, tableName: true, tableProvision: true } },
});

// Get one entityTypeProvision
const { data: item } = useEntityTypeProvisionQuery({
  id: '<UUID>',
  selection: { fields: { agents: true, databaseId: true, description: true, functions: true, graphs: true, hasInviteAchievements: true, hasInvites: true, hasLevels: true, hasLimits: true, hasProfiles: true, id: true, isVisible: true, name: true, namespaces: true, outAgentModuleId: true, outBucketsTableId: true, outDefinitionsTableId: true, outEntityTableId: true, outEntityTableName: true, outExecutionLogsTableId: true, outFilesTableId: true, outFunctionModuleId: true, outGraphModuleId: true, outGraphsTableId: true, outInstalledModules: true, outInvitesModuleId: true, outInvocationsTableId: true, outMembershipType: true, outNamespaceEventsTableId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outPathSharesTableId: true, outStorageModuleId: true, parentEntity: true, prefix: true, skipEntityPolicies: true, storage: true, tableName: true, tableProvision: true } },
});

// Create a entityTypeProvision
const { mutate: create } = useCreateEntityTypeProvisionMutation({
  selection: { fields: { id: true } },
});
create({ agents: '<JSON>', databaseId: '<UUID>', description: '<String>', functions: '<JSON>', graphs: '<JSON>', hasInviteAchievements: '<Boolean>', hasInvites: '<Boolean>', hasLevels: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', isVisible: '<Boolean>', name: '<String>', namespaces: '<JSON>', outAgentModuleId: '<UUID>', outBucketsTableId: '<UUID>', outDefinitionsTableId: '<UUID>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outExecutionLogsTableId: '<UUID>', outFilesTableId: '<UUID>', outFunctionModuleId: '<UUID>', outGraphModuleId: '<UUID>', outGraphsTableId: '<UUID>', outInstalledModules: '<String>', outInvitesModuleId: '<UUID>', outInvocationsTableId: '<UUID>', outMembershipType: '<Int>', outNamespaceEventsTableId: '<UUID>', outNamespaceModuleId: '<UUID>', outNamespacesTableId: '<UUID>', outPathSharesTableId: '<UUID>', outStorageModuleId: '<UUID>', parentEntity: '<String>', prefix: '<String>', skipEntityPolicies: '<Boolean>', storage: '<JSON>', tableName: '<String>', tableProvision: '<JSON>' });
```

### EventsModule

```typescript
// List all eventsModules
const { data, isLoading } = useEventsModulesQuery({
  selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordEvent: true, removeEvent: true, retention: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgUpdateAggregates: true, upsertAggregate: true } },
});

// Get one eventsModule
const { data: item } = useEventsModuleQuery({
  id: '<UUID>',
  selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordEvent: true, removeEvent: true, retention: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgUpdateAggregates: true, upsertAggregate: true } },
});

// Create a eventsModule
const { mutate: create } = useCreateEventsModuleMutation({
  selection: { fields: { id: true } },
});
create({ achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', grantAchievement: '<String>', interval: '<String>', levelAchieved: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordEvent: '<String>', removeEvent: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', stepsRequired: '<String>', tgAchievementReward: '<String>', tgCheckAchievements: '<String>', tgEvent: '<String>', tgEventBool: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgUpdateAggregates: '<String>', upsertAggregate: '<String>' });
```

### FunctionDeploymentModule

```typescript
// List all functionDeploymentModules
const { data, isLoading } = useFunctionDeploymentModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, deploymentEventsTableId: true, deploymentEventsTableName: true, deploymentsTableId: true, deploymentsTableName: true, entityField: true, entityTableId: true, functionModuleId: true, id: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one functionDeploymentModule
const { data: item } = useFunctionDeploymentModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, deploymentEventsTableId: true, deploymentEventsTableName: true, deploymentsTableId: true, deploymentsTableName: true, entityField: true, entityTableId: true, functionModuleId: true, id: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a functionDeploymentModule
const { mutate: create } = useCreateFunctionDeploymentModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', deploymentEventsTableId: '<UUID>', deploymentEventsTableName: '<String>', deploymentsTableId: '<UUID>', deploymentsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### FunctionInvocationModule

```typescript
// List all functionInvocationModules
const { data, isLoading } = useFunctionInvocationModulesQuery({
  selection: { fields: { apiName: true, attemptsTableId: true, attemptsTableName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionLogsTableId: true, executionLogsTableName: true, id: true, invocationsTableId: true, invocationsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one functionInvocationModule
const { data: item } = useFunctionInvocationModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, attemptsTableId: true, attemptsTableName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionLogsTableId: true, executionLogsTableName: true, id: true, invocationsTableId: true, invocationsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a functionInvocationModule
const { mutate: create } = useCreateFunctionInvocationModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', attemptsTableId: '<UUID>', attemptsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionLogsTableId: '<UUID>', executionLogsTableName: '<String>', invocationsTableId: '<UUID>', invocationsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### FunctionModule

```typescript
// List all functionModules
const { data, isLoading } = useFunctionModulesQuery({
  selection: { fields: { apiName: true, bindingsTableId: true, bindingsTableName: true, databaseId: true, defaultPermissions: true, definitionsTableId: true, definitionsTableName: true, entityField: true, entityTableId: true, hasCron: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schedulesTableId: true, schemaId: true, scope: true } },
});

// Get one functionModule
const { data: item } = useFunctionModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, bindingsTableId: true, bindingsTableName: true, databaseId: true, defaultPermissions: true, definitionsTableId: true, definitionsTableName: true, entityField: true, entityTableId: true, hasCron: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schedulesTableId: true, schemaId: true, scope: true } },
});

// Create a functionModule
const { mutate: create } = useCreateFunctionModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', bindingsTableId: '<UUID>', bindingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', definitionsTableId: '<UUID>', definitionsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasCron: '<Boolean>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schedulesTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>' });
```

### GraphExecutionModule

```typescript
// List all graphExecutionModules
const { data, isLoading } = useGraphExecutionModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionsTableId: true, executionsTableName: true, graphModuleId: true, id: true, nodeStatesTableId: true, nodeStatesTableName: true, outputsTableId: true, outputsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one graphExecutionModule
const { data: item } = useGraphExecutionModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionsTableId: true, executionsTableName: true, graphModuleId: true, id: true, nodeStatesTableId: true, nodeStatesTableName: true, outputsTableId: true, outputsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a graphExecutionModule
const { mutate: create } = useCreateGraphExecutionModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionsTableId: '<UUID>', executionsTableName: '<String>', graphModuleId: '<UUID>', nodeStatesTableId: '<UUID>', nodeStatesTableName: '<String>', outputsTableId: '<UUID>', outputsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### GraphModule

```typescript
// List all graphModules
const { data, isLoading } = useGraphModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, graphsTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true } },
});

// Get one graphModule
const { data: item } = useGraphModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, graphsTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true } },
});

// Create a graphModule
const { mutate: create } = useCreateGraphModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', graphsTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>' });
```

### HierarchyModule

```typescript
// List all hierarchyModules
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, chartEdgesTableId: true, chartEdgesTableName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, getManagersFunction: true, getSubordinatesFunction: true, hierarchySprtTableId: true, hierarchySprtTableName: true, id: true, isManagerOfFunction: true, prefix: true, privateSchemaId: true, privateSchemaName: true, rebuildHierarchyFunction: true, schemaId: true, scope: true, sprtTableName: true, usersTableId: true } },
});

// Get one hierarchyModule
const { data: item } = useHierarchyModuleQuery({
  id: '<UUID>',
  selection: { fields: { chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, chartEdgesTableId: true, chartEdgesTableName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, getManagersFunction: true, getSubordinatesFunction: true, hierarchySprtTableId: true, hierarchySprtTableName: true, id: true, isManagerOfFunction: true, prefix: true, privateSchemaId: true, privateSchemaName: true, rebuildHierarchyFunction: true, schemaId: true, scope: true, sprtTableName: true, usersTableId: true } },
});

// Create a hierarchyModule
const { mutate: create } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
create({ chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', getManagersFunction: '<String>', getSubordinatesFunction: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', isManagerOfFunction: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', rebuildHierarchyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableName: '<String>', usersTableId: '<UUID>' });
```

### HttpRouteModule

```typescript
// List all httpRouteModules
const { data, isLoading } = useHttpRouteModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionModuleId: true, httpRoutesTableId: true, httpRoutesTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, resourceModuleId: true, schemaId: true, scope: true, storageModuleId: true } },
});

// Get one httpRouteModule
const { data: item } = useHttpRouteModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionModuleId: true, httpRoutesTableId: true, httpRoutesTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, resourceModuleId: true, schemaId: true, scope: true, storageModuleId: true } },
});

// Create a httpRouteModule
const { mutate: create } = useCreateHttpRouteModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', httpRoutesTableId: '<UUID>', httpRoutesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', resourceModuleId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storageModuleId: '<UUID>' });
```

### I18NModule

```typescript
// List all i18nModules
const { data, isLoading } = useI18nModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, settingsTableId: true } },
});

// Get one i18NModule
const { data: item } = useI18NModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, settingsTableId: true } },
});

// Create a i18NModule
const { mutate: create } = useCreateI18NModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', settingsTableId: '<UUID>' });
```

### IdentityProvidersModule

```typescript
// List all identityProvidersModules
const { data, isLoading } = useIdentityProvidersModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Get one identityProvidersModule
const { data: item } = useIdentityProvidersModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Create a identityProvidersModule
const { mutate: create } = useCreateIdentityProvidersModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```

### InferenceLogModule

```typescript
// List all inferenceLogModules
const { data, isLoading } = useInferenceLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, inferenceLogTableId: true, inferenceLogTableName: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Get one inferenceLogModule
const { data: item } = useInferenceLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, inferenceLogTableId: true, inferenceLogTableName: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Create a inferenceLogModule
const { mutate: create } = useCreateInferenceLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```

### InfraConfigModule

```typescript
// List all infraConfigModules
const { data, isLoading } = useInfraConfigModulesQuery({
  selection: { fields: { apiName: true, configTableId: true, configTableName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one infraConfigModule
const { data: item } = useInfraConfigModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, configTableId: true, configTableName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a infraConfigModule
const { mutate: create } = useCreateInfraConfigModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', configTableId: '<UUID>', configTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### InfraSecretsModule

```typescript
// List all infraSecretsModules
const { data, isLoading } = useInfraSecretsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, secretsTableId: true, secretsTableName: true } },
});

// Get one infraSecretsModule
const { data: item } = useInfraSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, secretsTableId: true, secretsTableName: true } },
});

// Create a infraSecretsModule
const { mutate: create } = useCreateInfraSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>' });
```

### IntegrationProvidersModule

```typescript
// List all integrationProvidersModules
const { data, isLoading } = useIntegrationProvidersModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Get one integrationProvidersModule
const { data: item } = useIntegrationProvidersModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Create a integrationProvidersModule
const { mutate: create } = useCreateIntegrationProvidersModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```

### InternalSecretsModule

```typescript
// List all internalSecretsModules
const { data, isLoading } = useInternalSecretsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalSecretsTableId: true, internalSecretsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one internalSecretsModule
const { data: item } = useInternalSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalSecretsTableId: true, internalSecretsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a internalSecretsModule
const { mutate: create } = useCreateInternalSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### InvitesModule

```typescript
// List all invitesModules
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { apiName: true, claimedInvitesTableId: true, claimedInvitesTableName: true, databaseId: true, emailsTableId: true, entityField: true, entityTableId: true, id: true, invitesTableId: true, invitesTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, submitInviteCodeFunction: true, usersTableId: true } },
});

// Get one invitesModule
const { data: item } = useInvitesModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, claimedInvitesTableId: true, claimedInvitesTableName: true, databaseId: true, emailsTableId: true, entityField: true, entityTableId: true, id: true, invitesTableId: true, invitesTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, submitInviteCodeFunction: true, usersTableId: true } },
});

// Create a invitesModule
const { mutate: create } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', claimedInvitesTableId: '<UUID>', claimedInvitesTableName: '<String>', databaseId: '<UUID>', emailsTableId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', invitesTableId: '<UUID>', invitesTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', submitInviteCodeFunction: '<String>', usersTableId: '<UUID>' });
```

### LimitsModule

```typescript
// List all limitsModules
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { actorTableId: true, aggregateTableId: true, apiName: true, capCheckTrigger: true, creditCodeItemsTableId: true, creditCodesTableId: true, creditRedemptionsTableId: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, eventsTableId: true, id: true, limitAggregateCheckSoftFunction: true, limitCapsDefaultsTableId: true, limitCapsTableId: true, limitCheckFunction: true, limitCheckSoftFunction: true, limitCreditsTableId: true, limitDecrementFunction: true, limitDecrementTrigger: true, limitIncrementFunction: true, limitIncrementTrigger: true, limitUpdateTrigger: true, limitWarningStateTableId: true, limitWarningsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, resolveCapFunction: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Get one limitsModule
const { data: item } = useLimitsModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorTableId: true, aggregateTableId: true, apiName: true, capCheckTrigger: true, creditCodeItemsTableId: true, creditCodesTableId: true, creditRedemptionsTableId: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, eventsTableId: true, id: true, limitAggregateCheckSoftFunction: true, limitCapsDefaultsTableId: true, limitCapsTableId: true, limitCheckFunction: true, limitCheckSoftFunction: true, limitCreditsTableId: true, limitDecrementFunction: true, limitDecrementTrigger: true, limitIncrementFunction: true, limitIncrementTrigger: true, limitUpdateTrigger: true, limitWarningStateTableId: true, limitWarningsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, resolveCapFunction: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Create a limitsModule
const { mutate: create } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorTableId: '<UUID>', aggregateTableId: '<UUID>', apiName: '<String>', capCheckTrigger: '<String>', creditCodeItemsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventsTableId: '<UUID>', limitAggregateCheckSoftFunction: '<String>', limitCapsDefaultsTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCheckFunction: '<String>', limitCheckSoftFunction: '<String>', limitCreditsTableId: '<UUID>', limitDecrementFunction: '<String>', limitDecrementTrigger: '<String>', limitIncrementFunction: '<String>', limitIncrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitWarningStateTableId: '<UUID>', limitWarningsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', resolveCapFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```

### MembershipTypesModule

```typescript
// List all membershipTypesModules
const { data, isLoading } = useMembershipTypesModulesQuery({
  selection: { fields: { databaseId: true, id: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one membershipTypesModule
const { data: item } = useMembershipTypesModuleQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true, schemaId: true, tableId: true, tableName: true } },
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
  selection: { fields: { actorMaskCheck: true, actorPermCheck: true, actorTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, apiName: true, databaseId: true, defaultLimitsTableId: true, defaultPermissionsTableId: true, entityField: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, grantsTableId: true, grantsTableName: true, id: true, limitsTableId: true, memberProfilesTableId: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, membershipsTableId: true, membershipsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, permissionDefaultGrantsTableId: true, permissionDefaultPermissionsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, sprtTableId: true } },
});

// Get one membershipsModule
const { data: item } = useMembershipsModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorMaskCheck: true, actorPermCheck: true, actorTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, apiName: true, databaseId: true, defaultLimitsTableId: true, defaultPermissionsTableId: true, entityField: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, grantsTableId: true, grantsTableName: true, id: true, limitsTableId: true, memberProfilesTableId: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, membershipsTableId: true, membershipsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, permissionDefaultGrantsTableId: true, permissionDefaultPermissionsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, sprtTableId: true } },
});

// Create a membershipsModule
const { mutate: create } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorMaskCheck: '<String>', actorPermCheck: '<String>', actorTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultLimitsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', entityField: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', getOrgFn: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', limitsTableId: '<UUID>', memberProfilesTableId: '<UUID>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', permissionDefaultGrantsTableId: '<UUID>', permissionDefaultPermissionsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableId: '<UUID>' });
```

### MerkleStoreModule

```typescript
// List all merkleStoreModules
const { data, isLoading } = useMerkleStoreModulesQuery({
  selection: { fields: { apiName: true, commitTableId: true, createdAt: true, databaseId: true, entityField: true, functionPrefix: true, id: true, objectTableId: true, permissionKey: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, refTableId: true, schemaId: true, scope: true, storeTableId: true } },
});

// Get one merkleStoreModule
const { data: item } = useMerkleStoreModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, commitTableId: true, createdAt: true, databaseId: true, entityField: true, functionPrefix: true, id: true, objectTableId: true, permissionKey: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, refTableId: true, schemaId: true, scope: true, storeTableId: true } },
});

// Create a merkleStoreModule
const { mutate: create } = useCreateMerkleStoreModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', commitTableId: '<UUID>', databaseId: '<UUID>', entityField: '<String>', functionPrefix: '<String>', objectTableId: '<UUID>', permissionKey: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', refTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storeTableId: '<UUID>' });
```

### NamespaceModule

```typescript
// List all namespaceModules
const { data, isLoading } = useNamespaceModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, namespaceEventsTableId: true, namespaceEventsTableName: true, namespacesTableId: true, namespacesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Get one namespaceModule
const { data: item } = useNamespaceModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, namespaceEventsTableId: true, namespaceEventsTableName: true, namespacesTableId: true, namespacesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});

// Create a namespaceModule
const { mutate: create } = useCreateNamespaceModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespaceEventsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### NotificationsModule

```typescript
// List all notificationsModules
const { data, isLoading } = useNotificationsModulesQuery({
  selection: { fields: { apiName: true, channelsTableId: true, databaseId: true, defaultPermissions: true, deliveryLogTableId: true, entityField: true, hasChannels: true, hasDigestMetadata: true, hasPreferences: true, hasSettingsExtension: true, hasSubscriptions: true, id: true, notificationsTableId: true, organizationSettingsTableId: true, ownerTableId: true, preferencesTableId: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, readStateTableId: true, schemaId: true, suppressionsTableId: true, userSettingsTableId: true } },
});

// Get one notificationsModule
const { data: item } = useNotificationsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, channelsTableId: true, databaseId: true, defaultPermissions: true, deliveryLogTableId: true, entityField: true, hasChannels: true, hasDigestMetadata: true, hasPreferences: true, hasSettingsExtension: true, hasSubscriptions: true, id: true, notificationsTableId: true, organizationSettingsTableId: true, ownerTableId: true, preferencesTableId: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, readStateTableId: true, schemaId: true, suppressionsTableId: true, userSettingsTableId: true } },
});

// Create a notificationsModule
const { mutate: create } = useCreateNotificationsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', channelsTableId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', deliveryLogTableId: '<UUID>', entityField: '<String>', hasChannels: '<Boolean>', hasDigestMetadata: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasSubscriptions: '<Boolean>', notificationsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', ownerTableId: '<UUID>', preferencesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', readStateTableId: '<UUID>', schemaId: '<UUID>', suppressionsTableId: '<UUID>', userSettingsTableId: '<UUID>' });
```

### PermissionsModule

```typescript
// List all permissionsModules
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Get one permissionsModule
const { data: item } = usePermissionsModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorTableId: true, apiName: true, bitlen: true, databaseId: true, defaultTableId: true, defaultTableName: true, entityField: true, entityTableId: true, getByMask: true, getMask: true, getMaskByName: true, getPaddedMask: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Create a permissionsModule
const { mutate: create } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorTableId: '<UUID>', apiName: '<String>', bitlen: '<Int>', databaseId: '<UUID>', defaultTableId: '<UUID>', defaultTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', getByMask: '<String>', getMask: '<String>', getMaskByName: '<String>', getPaddedMask: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```

### PhoneNumbersModule

```typescript
// List all phoneNumbersModules
const { data, isLoading } = usePhoneNumbersModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one phoneNumbersModule
const { data: item } = usePhoneNumbersModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a phoneNumbersModule
const { mutate: create } = useCreatePhoneNumbersModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### PlansModule

```typescript
// List all plansModules
const { data, isLoading } = usePlansModulesQuery({
  selection: { fields: { apiName: true, applyBillingPlanFunction: true, applyPlanAggregateFunction: true, applyPlanCapsFunction: true, applyPlanFunction: true, databaseId: true, id: true, planCapsTableId: true, planLimitsTableId: true, planLimitsTableName: true, planMeterLimitsTableId: true, planOverridesTableId: true, planPricingTableId: true, plansTableId: true, plansTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true } },
});

// Get one plansModule
const { data: item } = usePlansModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, applyBillingPlanFunction: true, applyPlanAggregateFunction: true, applyPlanCapsFunction: true, applyPlanFunction: true, databaseId: true, id: true, planCapsTableId: true, planLimitsTableId: true, planLimitsTableName: true, planMeterLimitsTableId: true, planOverridesTableId: true, planPricingTableId: true, plansTableId: true, plansTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true } },
});

// Create a plansModule
const { mutate: create } = useCreatePlansModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', applyBillingPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', applyPlanCapsFunction: '<String>', applyPlanFunction: '<String>', databaseId: '<UUID>', planCapsTableId: '<UUID>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planMeterLimitsTableId: '<UUID>', planOverridesTableId: '<UUID>', planPricingTableId: '<UUID>', plansTableId: '<UUID>', plansTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>' });
```

### PrincipalAuthModule

```typescript
// List all principalAuthModules
const { data, isLoading } = usePrincipalAuthModulesQuery({
  selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } },
});

// Get one principalAuthModule
const { data: item } = usePrincipalAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } },
});

// Create a principalAuthModule
const { mutate: create } = useCreatePrincipalAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' });
```

### ProfilesModule

```typescript
// List all profilesModules
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { actorTableId: true, apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Get one profilesModule
const { data: item } = useProfilesModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorTableId: true, apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, membershipsTableId: true, permissionsTableId: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});

// Create a profilesModule
const { mutate: create } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', membershipsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```

### RateLimitMetersModule

```typescript
// List all rateLimitMetersModules
const { data, isLoading } = useRateLimitMetersModulesQuery({
  selection: { fields: { apiName: true, checkRateLimitFunction: true, databaseId: true, defaultPermissions: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, schemaId: true } },
});

// Get one rateLimitMetersModule
const { data: item } = useRateLimitMetersModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, checkRateLimitFunction: true, databaseId: true, defaultPermissions: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, schemaId: true } },
});

// Create a rateLimitMetersModule
const { mutate: create } = useCreateRateLimitMetersModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', checkRateLimitFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', schemaId: '<UUID>' });
```

### RateLimitsModule

```typescript
// List all rateLimitsModules
const { data, isLoading } = useRateLimitsModulesQuery({
  selection: { fields: { databaseId: true, id: true, ipRateLimitsTableId: true, ipRateLimitsTableName: true, rateLimitSettingsTableId: true, rateLimitSettingsTableName: true, rateLimitsTableId: true, rateLimitsTableName: true, schemaId: true } },
});

// Get one rateLimitsModule
const { data: item } = useRateLimitsModuleQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true, ipRateLimitsTableId: true, ipRateLimitsTableName: true, rateLimitSettingsTableId: true, rateLimitSettingsTableName: true, rateLimitsTableId: true, rateLimitsTableName: true, schemaId: true } },
});

// Create a rateLimitsModule
const { mutate: create } = useCreateRateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', ipRateLimitsTableId: '<UUID>', ipRateLimitsTableName: '<String>', rateLimitSettingsTableId: '<UUID>', rateLimitSettingsTableName: '<String>', rateLimitsTableId: '<UUID>', rateLimitsTableName: '<String>', schemaId: '<UUID>' });
```

### RealtimeModule

```typescript
// List all realtimeModules
const { data, isLoading } = useRealtimeModulesQuery({
  selection: { fields: { apiName: true, changeLogTableId: true, databaseId: true, id: true, interval: true, listenerNodeTableId: true, notifyChannel: true, premake: true, privateApiName: true, privateSchemaId: true, retentionHours: true, schemaId: true, sourceRegistryTableId: true, subscriptionsSchemaId: true } },
});

// Get one realtimeModule
const { data: item } = useRealtimeModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, changeLogTableId: true, databaseId: true, id: true, interval: true, listenerNodeTableId: true, notifyChannel: true, premake: true, privateApiName: true, privateSchemaId: true, retentionHours: true, schemaId: true, sourceRegistryTableId: true, subscriptionsSchemaId: true } },
});

// Create a realtimeModule
const { mutate: create } = useCreateRealtimeModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', changeLogTableId: '<UUID>', databaseId: '<UUID>', interval: '<String>', listenerNodeTableId: '<UUID>', notifyChannel: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', retentionHours: '<Int>', schemaId: '<UUID>', sourceRegistryTableId: '<UUID>', subscriptionsSchemaId: '<UUID>' });
```

### RelationProvision

```typescript
// List all relationProvisions
const { data, isLoading } = useRelationProvisionsQuery({
  selection: { fields: { apiRequired: true, createIndex: true, databaseId: true, deleteAction: true, exposeInApi: true, fieldName: true, grants: true, id: true, isRequired: true, junctionSchemaId: true, junctionTableId: true, junctionTableName: true, nodes: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, policies: true, relationType: true, sourceFieldName: true, sourceTableId: true, targetFieldName: true, targetTableId: true, useCompositeKey: true } },
});

// Get one relationProvision
const { data: item } = useRelationProvisionQuery({
  id: '<UUID>',
  selection: { fields: { apiRequired: true, createIndex: true, databaseId: true, deleteAction: true, exposeInApi: true, fieldName: true, grants: true, id: true, isRequired: true, junctionSchemaId: true, junctionTableId: true, junctionTableName: true, nodes: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, policies: true, relationType: true, sourceFieldName: true, sourceTableId: true, targetFieldName: true, targetTableId: true, useCompositeKey: true } },
});

// Create a relationProvision
const { mutate: create } = useCreateRelationProvisionMutation({
  selection: { fields: { id: true } },
});
create({ apiRequired: '<Boolean>', createIndex: '<Boolean>', databaseId: '<UUID>', deleteAction: '<String>', exposeInApi: '<Boolean>', fieldName: '<String>', grants: '<JSON>', isRequired: '<Boolean>', junctionSchemaId: '<UUID>', junctionTableId: '<UUID>', junctionTableName: '<String>', nodes: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>', policies: '<JSON>', relationType: '<String>', sourceFieldName: '<String>', sourceTableId: '<UUID>', targetFieldName: '<String>', targetTableId: '<UUID>', useCompositeKey: '<Boolean>' });
```

### ResourceModule

```typescript
// List all resourceModules
const { data, isLoading } = useResourceModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, installationStoreName: true, merkleStoreModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, requirementsStateViewName: true, resolvedRequirementsViewName: true, resourceBillingRollupFunction: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceEventsTableId: true, resourceEventsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourceStatusChecksTableId: true, resourceStatusChecksTableName: true, resourceUsageLogTableId: true, resourceUsageLogTableName: true, resourceUsageSummaryTableId: true, resourceUsageSummaryTableName: true, resourcesTableId: true, resourcesTableName: true, rollupResourceUsageSummaryFunction: true, schemaId: true, scope: true } },
});

// Get one resourceModule
const { data: item } = useResourceModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, installationStoreName: true, merkleStoreModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, requirementsStateViewName: true, resolvedRequirementsViewName: true, resourceBillingRollupFunction: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceEventsTableId: true, resourceEventsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourceStatusChecksTableId: true, resourceStatusChecksTableName: true, resourceUsageLogTableId: true, resourceUsageLogTableName: true, resourceUsageSummaryTableId: true, resourceUsageSummaryTableName: true, resourcesTableId: true, resourcesTableName: true, rollupResourceUsageSummaryFunction: true, schemaId: true, scope: true } },
});

// Create a resourceModule
const { mutate: create } = useCreateResourceModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', installationStoreName: '<String>', merkleStoreModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', requirementsStateViewName: '<String>', resolvedRequirementsViewName: '<String>', resourceBillingRollupFunction: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceEventsTableId: '<UUID>', resourceEventsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourceStatusChecksTableId: '<UUID>', resourceStatusChecksTableName: '<String>', resourceUsageLogTableId: '<UUID>', resourceUsageLogTableName: '<String>', resourceUsageSummaryTableId: '<UUID>', resourceUsageSummaryTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', rollupResourceUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### RlsModule

```typescript
// List all rlsModules
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { apiName: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } },
});

// Get one rlsModule
const { data: item } = useRlsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } },
});

// Create a rlsModule
const { mutate: create } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' });
```

### RouteModule

```typescript
// List all routeModules
const { data, isLoading } = useRouteModulesQuery({
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainModuleId: true, entityField: true, entityTableId: true, hostnameBindingsTableId: true, hostnameBindingsTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, routeBindingsTableId: true, routeBindingsTableName: true, routesTableId: true, routesTableName: true, schemaId: true, scope: true } },
});

// Get one routeModule
const { data: item } = useRouteModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainModuleId: true, entityField: true, entityTableId: true, hostnameBindingsTableId: true, hostnameBindingsTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, routeBindingsTableId: true, routeBindingsTableName: true, routesTableId: true, routesTableName: true, schemaId: true, scope: true } },
});

// Create a routeModule
const { mutate: create } = useCreateRouteModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainModuleId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', hostnameBindingsTableId: '<UUID>', hostnameBindingsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', routeBindingsTableId: '<UUID>', routeBindingsTableName: '<String>', routesTableId: '<UUID>', routesTableName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```

### SecureTableProvision

```typescript
// List all secureTableProvisions
const { data, isLoading } = useSecureTableProvisionsQuery({
  selection: { fields: { databaseId: true, fields: true, grants: true, id: true, nodes: true, outFields: true, policies: true, schemaId: true, tableId: true, tableName: true, useRls: true } },
});

// Get one secureTableProvision
const { data: item } = useSecureTableProvisionQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, fields: true, grants: true, id: true, nodes: true, outFields: true, policies: true, schemaId: true, tableId: true, tableName: true, useRls: true } },
});

// Create a secureTableProvision
const { mutate: create } = useCreateSecureTableProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', fields: '<JSON>', grants: '<JSON>', nodes: '<JSON>', outFields: '<UUID>', policies: '<JSON>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', useRls: '<Boolean>' });
```

### SessionSecretsModule

```typescript
// List all sessionSecretsModules
const { data, isLoading } = useSessionSecretsModulesQuery({
  selection: { fields: { databaseId: true, id: true, schemaId: true, sessionsTableId: true, tableId: true, tableName: true } },
});

// Get one sessionSecretsModule
const { data: item } = useSessionSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true, schemaId: true, sessionsTableId: true, tableId: true, tableName: true } },
});

// Create a sessionSecretsModule
const { mutate: create } = useCreateSessionSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### SessionsModule

```typescript
// List all sessionsModules
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { authSettingsTableId: true, authSettingsTableName: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTableId: true, sessionCredentialsTableName: true, sessionsDefaultExpiration: true, sessionsTableId: true, sessionsTableName: true, usersTableId: true } },
});

// Get one sessionsModule
const { data: item } = useSessionsModuleQuery({
  id: '<UUID>',
  selection: { fields: { authSettingsTableId: true, authSettingsTableName: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTableId: true, sessionCredentialsTableName: true, sessionsDefaultExpiration: true, sessionsTableId: true, sessionsTableName: true, usersTableId: true } },
});

// Create a sessionsModule
const { mutate: create } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ authSettingsTableId: '<UUID>', authSettingsTableName: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionCredentialsTableName: '<String>', sessionsDefaultExpiration: '<Interval>', sessionsTableId: '<UUID>', sessionsTableName: '<String>', usersTableId: '<UUID>' });
```

### SiteSurfaceModule

```typescript
// List all siteSurfaceModules
const { data, isLoading } = useSiteSurfaceModulesQuery({
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteMetadataTableId: true, siteMetadataTableName: true, siteModulesTableId: true, siteModulesTableName: true, siteThemesTableId: true, siteThemesTableName: true, sitesTableId: true, sitesTableName: true } },
});

// Get one siteSurfaceModule
const { data: item } = useSiteSurfaceModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteMetadataTableId: true, siteMetadataTableName: true, siteModulesTableId: true, siteModulesTableName: true, siteThemesTableId: true, siteThemesTableName: true, sitesTableId: true, sitesTableName: true } },
});

// Create a siteSurfaceModule
const { mutate: create } = useCreateSiteSurfaceModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', siteMetadataTableId: '<UUID>', siteMetadataTableName: '<String>', siteModulesTableId: '<UUID>', siteModulesTableName: '<String>', siteThemesTableId: '<UUID>', siteThemesTableName: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>' });
```

### StorageLogModule

```typescript
// List all storageLogModules
const { data, isLoading } = useStorageLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Get one storageLogModule
const { data: item } = useStorageLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Create a storageLogModule
const { mutate: create } = useCreateStorageLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```

### StorageModule

```typescript
// List all storageModules
const { data, isLoading } = useStorageModulesQuery({
  selection: { fields: { allowedOrigins: true, apiName: true, bucketsTableId: true, bucketsTableName: true, cacheTtlSeconds: true, confirmUploadDelay: true, databaseId: true, defaultMaxFileSize: true, defaultPermissions: true, downloadUrlExpirySeconds: true, endpoint: true, entityField: true, entityTableId: true, fileEventsTableId: true, filesTableId: true, filesTableName: true, hasAuditLog: true, hasConfirmUpload: true, hasContentHash: true, hasCustomKeys: true, hasPathShares: true, hasVersioning: true, id: true, maxBulkFiles: true, maxBulkTotalSize: true, maxFilenameLength: true, pathSharesTableId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provider: true, provisions: true, publicSchemaName: true, publicUrlPrefix: true, restrictReads: true, schemaId: true, scope: true, uploadUrlExpirySeconds: true } },
});

// Get one storageModule
const { data: item } = useStorageModuleQuery({
  id: '<UUID>',
  selection: { fields: { allowedOrigins: true, apiName: true, bucketsTableId: true, bucketsTableName: true, cacheTtlSeconds: true, confirmUploadDelay: true, databaseId: true, defaultMaxFileSize: true, defaultPermissions: true, downloadUrlExpirySeconds: true, endpoint: true, entityField: true, entityTableId: true, fileEventsTableId: true, filesTableId: true, filesTableName: true, hasAuditLog: true, hasConfirmUpload: true, hasContentHash: true, hasCustomKeys: true, hasPathShares: true, hasVersioning: true, id: true, maxBulkFiles: true, maxBulkTotalSize: true, maxFilenameLength: true, pathSharesTableId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provider: true, provisions: true, publicSchemaName: true, publicUrlPrefix: true, restrictReads: true, schemaId: true, scope: true, uploadUrlExpirySeconds: true } },
});

// Create a storageModule
const { mutate: create } = useCreateStorageModuleMutation({
  selection: { fields: { id: true } },
});
create({ allowedOrigins: '<String>', apiName: '<String>', bucketsTableId: '<UUID>', bucketsTableName: '<String>', cacheTtlSeconds: '<Int>', confirmUploadDelay: '<Interval>', databaseId: '<UUID>', defaultMaxFileSize: '<BigInt>', defaultPermissions: '<String>', downloadUrlExpirySeconds: '<Int>', endpoint: '<String>', entityField: '<String>', entityTableId: '<UUID>', fileEventsTableId: '<UUID>', filesTableId: '<UUID>', filesTableName: '<String>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasPathShares: '<Boolean>', hasVersioning: '<Boolean>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', maxFilenameLength: '<Int>', pathSharesTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provider: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', publicUrlPrefix: '<String>', restrictReads: '<Boolean>', schemaId: '<UUID>', scope: '<String>', uploadUrlExpirySeconds: '<Int>' });
```

### TransferLogModule

```typescript
// List all transferLogModules
const { data, isLoading } = useTransferLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Get one transferLogModule
const { data: item } = useTransferLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});

// Create a transferLogModule
const { mutate: create } = useCreateTransferLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```

### UserAuthModule

```typescript
// List all userAuthModules
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { apiName: true, auditsTableId: true, auditsTableName: true, checkPasswordFunction: true, databaseId: true, deleteAccountFunction: true, emailsTableId: true, encryptedTableId: true, extendTokenExpires: true, forgotPasswordFunction: true, id: true, privateApiName: true, requestCrossOriginTokenFunction: true, resetPasswordFunction: true, schemaId: true, secretsTableId: true, sendAccountDeletionEmailFunction: true, sendVerificationEmailFunction: true, sessionCredentialsTableId: true, sessionsTableId: true, setPasswordFunction: true, signInCrossOriginFunction: true, signInFunction: true, signOutFunction: true, signUpFunction: true, usersTableId: true, verifyEmailFunction: true, verifyPasswordFunction: true } },
});

// Get one userAuthModule
const { data: item } = useUserAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, auditsTableId: true, auditsTableName: true, checkPasswordFunction: true, databaseId: true, deleteAccountFunction: true, emailsTableId: true, encryptedTableId: true, extendTokenExpires: true, forgotPasswordFunction: true, id: true, privateApiName: true, requestCrossOriginTokenFunction: true, resetPasswordFunction: true, schemaId: true, secretsTableId: true, sendAccountDeletionEmailFunction: true, sendVerificationEmailFunction: true, sessionCredentialsTableId: true, sessionsTableId: true, setPasswordFunction: true, signInCrossOriginFunction: true, signInFunction: true, signOutFunction: true, signUpFunction: true, usersTableId: true, verifyEmailFunction: true, verifyPasswordFunction: true } },
});

// Create a userAuthModule
const { mutate: create } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', auditsTableId: '<UUID>', auditsTableName: '<String>', checkPasswordFunction: '<String>', databaseId: '<UUID>', deleteAccountFunction: '<String>', emailsTableId: '<UUID>', encryptedTableId: '<UUID>', extendTokenExpires: '<String>', forgotPasswordFunction: '<String>', privateApiName: '<String>', requestCrossOriginTokenFunction: '<String>', resetPasswordFunction: '<String>', schemaId: '<UUID>', secretsTableId: '<UUID>', sendAccountDeletionEmailFunction: '<String>', sendVerificationEmailFunction: '<String>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', setPasswordFunction: '<String>', signInCrossOriginFunction: '<String>', signInFunction: '<String>', signOutFunction: '<String>', signUpFunction: '<String>', usersTableId: '<UUID>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>' });
```

### UserCredentialsModule

```typescript
// List all userCredentialsModules
const { data, isLoading } = useUserCredentialsModulesQuery({
  selection: { fields: { databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one userCredentialsModule
const { data: item } = useUserCredentialsModuleQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, entityField: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a userCredentialsModule
const { mutate: create } = useCreateUserCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### UserSettingsModule

```typescript
// List all userSettingsModules
const { data, isLoading } = useUserSettingsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one userSettingsModule
const { data: item } = useUserSettingsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a userSettingsModule
const { mutate: create } = useCreateUserSettingsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### UserStateModule

```typescript
// List all userStateModules
const { data, isLoading } = useUserStateModulesQuery({
  selection: { fields: { databaseId: true, entityField: true, id: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one userStateModule
const { data: item } = useUserStateModuleQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, entityField: true, id: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a userStateModule
const { mutate: create } = useCreateUserStateModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### UsersModule

```typescript
// List all usersModules
const { data, isLoading } = useUsersModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } },
});

// Get one usersModule
const { data: item } = useUsersModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, id: true, privateApiName: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } },
});

// Create a usersModule
const { mutate: create } = useCreateUsersModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>' });
```

### WebauthnAuthModule

```typescript
// List all webauthnAuthModules
const { data, isLoading } = useWebauthnAuthModulesQuery({
  selection: { fields: { attestationType: true, authSettingsTableId: true, challengeExpiry: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, sessionsTableId: true, usersTableId: true } },
});

// Get one webauthnAuthModule
const { data: item } = useWebauthnAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { attestationType: true, authSettingsTableId: true, challengeExpiry: true, credentialsTableId: true, databaseId: true, id: true, originAllowlist: true, requireUserVerification: true, residentKey: true, rpId: true, rpName: true, schemaId: true, sessionCredentialsTableId: true, sessionSecretsTableId: true, sessionsTableId: true, usersTableId: true } },
});

// Create a webauthnAuthModule
const { mutate: create } = useCreateWebauthnAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ attestationType: '<String>', authSettingsTableId: '<UUID>', challengeExpiry: '<Interval>', credentialsTableId: '<UUID>', databaseId: '<UUID>', originAllowlist: '<String>', requireUserVerification: '<Boolean>', residentKey: '<String>', rpId: '<String>', rpName: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionSecretsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' });
```

### WebauthnCredentialsModule

```typescript
// List all webauthnCredentialsModules
const { data, isLoading } = useWebauthnCredentialsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one webauthnCredentialsModule
const { data: item } = useWebauthnCredentialsModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a webauthnCredentialsModule
const { mutate: create } = useCreateWebauthnCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### WebhookModule

```typescript
// List all webhookModules
const { data, isLoading } = useWebhookModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionInvocationModuleId: true, functionModuleId: true, id: true, infraSecretsModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, webhookEndpointsTableId: true, webhookEndpointsTableName: true, webhookEventsTableId: true, webhookEventsTableName: true } },
});

// Get one webhookModule
const { data: item } = useWebhookModuleQuery({
  id: '<UUID>',
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionInvocationModuleId: true, functionModuleId: true, id: true, infraSecretsModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, webhookEndpointsTableId: true, webhookEndpointsTableName: true, webhookEventsTableId: true, webhookEventsTableName: true } },
});

// Create a webhookModule
const { mutate: create } = useCreateWebhookModuleMutation({
  selection: { fields: { id: true } },
});
create({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionInvocationModuleId: '<UUID>', functionModuleId: '<UUID>', infraSecretsModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', webhookEndpointsTableId: '<UUID>', webhookEndpointsTableName: '<String>', webhookEventsTableId: '<UUID>', webhookEventsTableName: '<String>' });
```

## Custom Operation Hooks

### `useResolveBlueprintFieldQuery`

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `fieldName` | String |
  | `tableId` | UUID |

### `useResolveBlueprintTableQuery`

Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `defaultSchemaId` | UUID |
  | `schemaName` | String |
  | `tableMap` | JSON |
  | `tableName` | String |

### `useConstructBlueprintMutation`

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When function_module is installed, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConstructBlueprintInput (required) |

### `useCopyTemplateToBlueprintMutation`

Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyTemplateToBlueprintInput (required) |

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

### `useProvisionCheckConstraintMutation`

Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionCheckConstraintInput (required) |

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

### `useProvisionRelationMutation`

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionRelationInput (required) |

### `useProvisionSpatialRelationMutation`

Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionSpatialRelationInput (required) |

### `useProvisionTableMutation`

Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionTableInput (required) |

### `useProvisionUniqueConstraintMutation`

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionUniqueConstraintInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
