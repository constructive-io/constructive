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
| `useDefaultIdsModulesQuery` | Query | List all defaultIdsModules |
| `useDefaultIdsModuleQuery` | Query | Get one defaultIdsModule |
| `useCreateDefaultIdsModuleMutation` | Mutation | Create a defaultIdsModule |
| `useUpdateDefaultIdsModuleMutation` | Mutation | Update a defaultIdsModule |
| `useDeleteDefaultIdsModuleMutation` | Mutation | Delete a defaultIdsModule |
| `useMembershipTypesModulesQuery` | Query | List all membershipTypesModules |
| `useMembershipTypesModuleQuery` | Query | Get one membershipTypesModule |
| `useCreateMembershipTypesModuleMutation` | Mutation | Create a membershipTypesModule |
| `useUpdateMembershipTypesModuleMutation` | Mutation | Update a membershipTypesModule |
| `useDeleteMembershipTypesModuleMutation` | Mutation | Delete a membershipTypesModule |
| `useSessionSecretsModulesQuery` | Query | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useSessionSecretsModuleQuery` | Query | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useCreateSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useUpdateSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useDeleteSessionSecretsModuleMutation` | Mutation | Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users. |
| `useDevicesModulesQuery` | Query | List all devicesModules |
| `useDevicesModuleQuery` | Query | Get one devicesModule |
| `useCreateDevicesModuleMutation` | Mutation | Create a devicesModule |
| `useUpdateDevicesModuleMutation` | Mutation | Update a devicesModule |
| `useDeleteDevicesModuleMutation` | Mutation | Delete a devicesModule |
| `useI18nModulesQuery` | Query | List all i18nModules |
| `useI18NModuleQuery` | Query | Get one i18NModule |
| `useCreateI18NModuleMutation` | Mutation | Create a i18NModule |
| `useUpdateI18NModuleMutation` | Mutation | Update a i18NModule |
| `useDeleteI18NModuleMutation` | Mutation | Delete a i18NModule |
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
| `useConnectedAccountsModulesQuery` | Query | List all connectedAccountsModules |
| `useConnectedAccountsModuleQuery` | Query | Get one connectedAccountsModule |
| `useCreateConnectedAccountsModuleMutation` | Mutation | Create a connectedAccountsModule |
| `useUpdateConnectedAccountsModuleMutation` | Mutation | Update a connectedAccountsModule |
| `useDeleteConnectedAccountsModuleMutation` | Mutation | Delete a connectedAccountsModule |
| `useEmailsModulesQuery` | Query | List all emailsModules |
| `useEmailsModuleQuery` | Query | Get one emailsModule |
| `useCreateEmailsModuleMutation` | Mutation | Create a emailsModule |
| `useUpdateEmailsModuleMutation` | Mutation | Update a emailsModule |
| `useDeleteEmailsModuleMutation` | Mutation | Delete a emailsModule |
| `usePhoneNumbersModulesQuery` | Query | List all phoneNumbersModules |
| `usePhoneNumbersModuleQuery` | Query | Get one phoneNumbersModule |
| `useCreatePhoneNumbersModuleMutation` | Mutation | Create a phoneNumbersModule |
| `useUpdatePhoneNumbersModuleMutation` | Mutation | Update a phoneNumbersModule |
| `useDeletePhoneNumbersModuleMutation` | Mutation | Delete a phoneNumbersModule |
| `useRateLimitsModulesQuery` | Query | List all rateLimitsModules |
| `useRateLimitsModuleQuery` | Query | Get one rateLimitsModule |
| `useCreateRateLimitsModuleMutation` | Mutation | Create a rateLimitsModule |
| `useUpdateRateLimitsModuleMutation` | Mutation | Update a rateLimitsModule |
| `useDeleteRateLimitsModuleMutation` | Mutation | Delete a rateLimitsModule |
| `useUsersModulesQuery` | Query | List all usersModules |
| `useUsersModuleQuery` | Query | Get one usersModule |
| `useCreateUsersModuleMutation` | Mutation | Create a usersModule |
| `useUpdateUsersModuleMutation` | Mutation | Update a usersModule |
| `useDeleteUsersModuleMutation` | Mutation | Delete a usersModule |
| `useWebauthnCredentialsModulesQuery` | Query | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useWebauthnCredentialsModuleQuery` | Query | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useCreateWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useUpdateWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useDeleteWebauthnCredentialsModuleMutation` | Mutation | Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state. |
| `useConfigSecretsUserModulesQuery` | Query | List all configSecretsUserModules |
| `useConfigSecretsUserModuleQuery` | Query | Get one configSecretsUserModule |
| `useCreateConfigSecretsUserModuleMutation` | Mutation | Create a configSecretsUserModule |
| `useUpdateConfigSecretsUserModuleMutation` | Mutation | Update a configSecretsUserModule |
| `useDeleteConfigSecretsUserModuleMutation` | Mutation | Delete a configSecretsUserModule |
| `useCryptoAddressesModulesQuery` | Query | List all cryptoAddressesModules |
| `useCryptoAddressesModuleQuery` | Query | Get one cryptoAddressesModule |
| `useCreateCryptoAddressesModuleMutation` | Mutation | Create a cryptoAddressesModule |
| `useUpdateCryptoAddressesModuleMutation` | Mutation | Update a cryptoAddressesModule |
| `useDeleteCryptoAddressesModuleMutation` | Mutation | Delete a cryptoAddressesModule |
| `useDenormalizedTableFieldsQuery` | Query | List all denormalizedTableFields |
| `useDenormalizedTableFieldQuery` | Query | Get one denormalizedTableField |
| `useCreateDenormalizedTableFieldMutation` | Mutation | Create a denormalizedTableField |
| `useUpdateDenormalizedTableFieldMutation` | Mutation | Update a denormalizedTableField |
| `useDeleteDenormalizedTableFieldMutation` | Mutation | Delete a denormalizedTableField |
| `useRlsModulesQuery` | Query | List all rlsModules |
| `useRlsModuleQuery` | Query | Get one rlsModule |
| `useCreateRlsModuleMutation` | Mutation | Create a rlsModule |
| `useUpdateRlsModuleMutation` | Mutation | Update a rlsModule |
| `useDeleteRlsModuleMutation` | Mutation | Delete a rlsModule |
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
| `useCryptoAuthModulesQuery` | Query | List all cryptoAuthModules |
| `useCryptoAuthModuleQuery` | Query | Get one cryptoAuthModule |
| `useCreateCryptoAuthModuleMutation` | Mutation | Create a cryptoAuthModule |
| `useUpdateCryptoAuthModuleMutation` | Mutation | Update a cryptoAuthModule |
| `useDeleteCryptoAuthModuleMutation` | Mutation | Delete a cryptoAuthModule |
| `useSessionsModulesQuery` | Query | List all sessionsModules |
| `useSessionsModuleQuery` | Query | Get one sessionsModule |
| `useCreateSessionsModuleMutation` | Mutation | Create a sessionsModule |
| `useUpdateSessionsModuleMutation` | Mutation | Update a sessionsModule |
| `useDeleteSessionsModuleMutation` | Mutation | Delete a sessionsModule |
| `useSecureTableProvisionsQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useSecureTableProvisionQuery` | Query | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useCreateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useUpdateSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
| `useDeleteSecureTableProvisionMutation` | Mutation | Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. |
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
| `useDbPoolConfigsQuery` | Query | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useDbPoolConfigQuery` | Query | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useCreateDbPoolConfigMutation` | Mutation | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useUpdateDbPoolConfigMutation` | Mutation | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useDeleteDbPoolConfigMutation` | Mutation | Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases. |
| `useRealtimeModulesQuery` | Query | List all realtimeModules |
| `useRealtimeModuleQuery` | Query | Get one realtimeModule |
| `useCreateRealtimeModuleMutation` | Mutation | Create a realtimeModule |
| `useUpdateRealtimeModuleMutation` | Mutation | Update a realtimeModule |
| `useDeleteRealtimeModuleMutation` | Mutation | Delete a realtimeModule |
| `useInfraSecretsModulesQuery` | Query | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useInfraSecretsModuleQuery` | Query | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useCreateInfraSecretsModuleMutation` | Mutation | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useUpdateInfraSecretsModuleMutation` | Mutation | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useDeleteInfraSecretsModuleMutation` | Mutation | Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization. |
| `useInternalSecretsModulesQuery` | Query | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useInternalSecretsModuleQuery` | Query | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useCreateInternalSecretsModuleMutation` | Mutation | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useUpdateInternalSecretsModuleMutation` | Mutation | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useDeleteInternalSecretsModuleMutation` | Mutation | App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage. |
| `useDbPresetModulesQuery` | Query | List all dbPresetModules |
| `useDbPresetModuleQuery` | Query | Get one dbPresetModule |
| `useCreateDbPresetModuleMutation` | Mutation | Create a dbPresetModule |
| `useUpdateDbPresetModuleMutation` | Mutation | Update a dbPresetModule |
| `useDeleteDbPresetModuleMutation` | Mutation | Delete a dbPresetModule |
| `useGraphModulesQuery` | Query | List all graphModules |
| `useGraphModuleQuery` | Query | Get one graphModule |
| `useCreateGraphModuleMutation` | Mutation | Create a graphModule |
| `useUpdateGraphModuleMutation` | Mutation | Update a graphModule |
| `useDeleteGraphModuleMutation` | Mutation | Delete a graphModule |
| `useRateLimitMetersModulesQuery` | Query | List all rateLimitMetersModules |
| `useRateLimitMetersModuleQuery` | Query | Get one rateLimitMetersModule |
| `useCreateRateLimitMetersModuleMutation` | Mutation | Create a rateLimitMetersModule |
| `useUpdateRateLimitMetersModuleMutation` | Mutation | Update a rateLimitMetersModule |
| `useDeleteRateLimitMetersModuleMutation` | Mutation | Delete a rateLimitMetersModule |
| `useInfraConfigModulesQuery` | Query | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useInfraConfigModuleQuery` | Query | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useCreateInfraConfigModuleMutation` | Mutation | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useUpdateInfraConfigModuleMutation` | Mutation | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useDeleteInfraConfigModuleMutation` | Mutation | Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization. |
| `useWebauthnAuthModulesQuery` | Query | List all webauthnAuthModules |
| `useWebauthnAuthModuleQuery` | Query | Get one webauthnAuthModule |
| `useCreateWebauthnAuthModuleMutation` | Mutation | Create a webauthnAuthModule |
| `useUpdateWebauthnAuthModuleMutation` | Mutation | Update a webauthnAuthModule |
| `useDeleteWebauthnAuthModuleMutation` | Mutation | Delete a webauthnAuthModule |
| `usePrincipalAuthModulesQuery` | Query | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `usePrincipalAuthModuleQuery` | Query | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useCreatePrincipalAuthModuleMutation` | Mutation | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useUpdatePrincipalAuthModuleMutation` | Mutation | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useDeletePrincipalAuthModuleMutation` | Mutation | Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database. |
| `useDbPoolsQuery` | Query | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useDbPoolQuery` | Query | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useCreateDbPoolMutation` | Mutation | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useUpdateDbPoolMutation` | Mutation | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useDeleteDbPoolMutation` | Mutation | Warm database pool entries. Rows are inserted as warming (which enqueues a db_pool:warm_database job), become ready once provisioned, and are handed to users via metaschema_private.db_pool_claim (invoked by metaschema_public.request_database). |
| `useFunctionModulesQuery` | Query | List all functionModules |
| `useFunctionModuleQuery` | Query | Get one functionModule |
| `useCreateFunctionModuleMutation` | Mutation | Create a functionModule |
| `useUpdateFunctionModuleMutation` | Mutation | Update a functionModule |
| `useDeleteFunctionModuleMutation` | Mutation | Delete a functionModule |
| `useMerkleStoreModulesQuery` | Query | List all merkleStoreModules |
| `useMerkleStoreModuleQuery` | Query | Get one merkleStoreModule |
| `useCreateMerkleStoreModuleMutation` | Mutation | Create a merkleStoreModule |
| `useUpdateMerkleStoreModuleMutation` | Mutation | Update a merkleStoreModule |
| `useDeleteMerkleStoreModuleMutation` | Mutation | Delete a merkleStoreModule |
| `useDatabaseProvisionModulesQuery` | Query | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useDatabaseProvisionModuleQuery` | Query | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useCreateDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useUpdateDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useDeleteDatabaseProvisionModuleMutation` | Mutation | Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated. |
| `useFunctionInvocationModulesQuery` | Query | List all functionInvocationModules |
| `useFunctionInvocationModuleQuery` | Query | Get one functionInvocationModule |
| `useCreateFunctionInvocationModuleMutation` | Mutation | Create a functionInvocationModule |
| `useUpdateFunctionInvocationModuleMutation` | Mutation | Update a functionInvocationModule |
| `useDeleteFunctionInvocationModuleMutation` | Mutation | Delete a functionInvocationModule |
| `useInvitesModulesQuery` | Query | List all invitesModules |
| `useInvitesModuleQuery` | Query | Get one invitesModule |
| `useCreateInvitesModuleMutation` | Mutation | Create a invitesModule |
| `useUpdateInvitesModuleMutation` | Mutation | Update a invitesModule |
| `useDeleteInvitesModuleMutation` | Mutation | Delete a invitesModule |
| `useNamespaceModulesQuery` | Query | List all namespaceModules |
| `useNamespaceModuleQuery` | Query | Get one namespaceModule |
| `useCreateNamespaceModuleMutation` | Mutation | Create a namespaceModule |
| `useUpdateNamespaceModuleMutation` | Mutation | Update a namespaceModule |
| `useDeleteNamespaceModuleMutation` | Mutation | Delete a namespaceModule |
| `usePlansModulesQuery` | Query | List all plansModules |
| `usePlansModuleQuery` | Query | Get one plansModule |
| `useCreatePlansModuleMutation` | Mutation | Create a plansModule |
| `useUpdatePlansModuleMutation` | Mutation | Update a plansModule |
| `useDeletePlansModuleMutation` | Mutation | Delete a plansModule |
| `useComputeLogModulesQuery` | Query | List all computeLogModules |
| `useComputeLogModuleQuery` | Query | Get one computeLogModule |
| `useCreateComputeLogModuleMutation` | Mutation | Create a computeLogModule |
| `useUpdateComputeLogModuleMutation` | Mutation | Update a computeLogModule |
| `useDeleteComputeLogModuleMutation` | Mutation | Delete a computeLogModule |
| `useInferenceLogModulesQuery` | Query | List all inferenceLogModules |
| `useInferenceLogModuleQuery` | Query | Get one inferenceLogModule |
| `useCreateInferenceLogModuleMutation` | Mutation | Create a inferenceLogModule |
| `useUpdateInferenceLogModuleMutation` | Mutation | Update a inferenceLogModule |
| `useDeleteInferenceLogModuleMutation` | Mutation | Delete a inferenceLogModule |
| `useStorageLogModulesQuery` | Query | List all storageLogModules |
| `useStorageLogModuleQuery` | Query | Get one storageLogModule |
| `useCreateStorageLogModuleMutation` | Mutation | Create a storageLogModule |
| `useUpdateStorageLogModuleMutation` | Mutation | Update a storageLogModule |
| `useDeleteStorageLogModuleMutation` | Mutation | Delete a storageLogModule |
| `useTransferLogModulesQuery` | Query | List all transferLogModules |
| `useTransferLogModuleQuery` | Query | Get one transferLogModule |
| `useCreateTransferLogModuleMutation` | Mutation | Create a transferLogModule |
| `useUpdateTransferLogModuleMutation` | Mutation | Update a transferLogModule |
| `useDeleteTransferLogModuleMutation` | Mutation | Delete a transferLogModule |
| `useBillingProviderModulesQuery` | Query | List all billingProviderModules |
| `useBillingProviderModuleQuery` | Query | Get one billingProviderModule |
| `useCreateBillingProviderModuleMutation` | Mutation | Create a billingProviderModule |
| `useUpdateBillingProviderModuleMutation` | Mutation | Update a billingProviderModule |
| `useDeleteBillingProviderModuleMutation` | Mutation | Delete a billingProviderModule |
| `useFunctionDeploymentModulesQuery` | Query | List all functionDeploymentModules |
| `useFunctionDeploymentModuleQuery` | Query | Get one functionDeploymentModule |
| `useCreateFunctionDeploymentModuleMutation` | Mutation | Create a functionDeploymentModule |
| `useUpdateFunctionDeploymentModuleMutation` | Mutation | Update a functionDeploymentModule |
| `useDeleteFunctionDeploymentModuleMutation` | Mutation | Delete a functionDeploymentModule |
| `usePermissionsModulesQuery` | Query | List all permissionsModules |
| `usePermissionsModuleQuery` | Query | Get one permissionsModule |
| `useCreatePermissionsModuleMutation` | Mutation | Create a permissionsModule |
| `useUpdatePermissionsModuleMutation` | Mutation | Update a permissionsModule |
| `useDeletePermissionsModuleMutation` | Mutation | Delete a permissionsModule |
| `useGraphExecutionModulesQuery` | Query | List all graphExecutionModules |
| `useGraphExecutionModuleQuery` | Query | Get one graphExecutionModule |
| `useCreateGraphExecutionModuleMutation` | Mutation | Create a graphExecutionModule |
| `useUpdateGraphExecutionModuleMutation` | Mutation | Update a graphExecutionModule |
| `useDeleteGraphExecutionModuleMutation` | Mutation | Delete a graphExecutionModule |
| `useHierarchyModulesQuery` | Query | List all hierarchyModules |
| `useHierarchyModuleQuery` | Query | Get one hierarchyModule |
| `useCreateHierarchyModuleMutation` | Mutation | Create a hierarchyModule |
| `useUpdateHierarchyModuleMutation` | Mutation | Update a hierarchyModule |
| `useDeleteHierarchyModuleMutation` | Mutation | Delete a hierarchyModule |
| `useNotificationsModulesQuery` | Query | List all notificationsModules |
| `useNotificationsModuleQuery` | Query | Get one notificationsModule |
| `useCreateNotificationsModuleMutation` | Mutation | Create a notificationsModule |
| `useUpdateNotificationsModuleMutation` | Mutation | Update a notificationsModule |
| `useDeleteNotificationsModuleMutation` | Mutation | Delete a notificationsModule |
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
| `useProfilesModulesQuery` | Query | List all profilesModules |
| `useProfilesModuleQuery` | Query | Get one profilesModule |
| `useCreateProfilesModuleMutation` | Mutation | Create a profilesModule |
| `useUpdateProfilesModuleMutation` | Mutation | Update a profilesModule |
| `useDeleteProfilesModuleMutation` | Mutation | Delete a profilesModule |
| `useBillingModulesQuery` | Query | List all billingModules |
| `useBillingModuleQuery` | Query | Get one billingModule |
| `useCreateBillingModuleMutation` | Mutation | Create a billingModule |
| `useUpdateBillingModuleMutation` | Mutation | Update a billingModule |
| `useDeleteBillingModuleMutation` | Mutation | Delete a billingModule |
| `useResourceModulesQuery` | Query | List all resourceModules |
| `useResourceModuleQuery` | Query | Get one resourceModule |
| `useCreateResourceModuleMutation` | Mutation | Create a resourceModule |
| `useUpdateResourceModuleMutation` | Mutation | Update a resourceModule |
| `useDeleteResourceModuleMutation` | Mutation | Delete a resourceModule |
| `useUserAuthModulesQuery` | Query | List all userAuthModules |
| `useUserAuthModuleQuery` | Query | Get one userAuthModule |
| `useCreateUserAuthModuleMutation` | Mutation | Create a userAuthModule |
| `useUpdateUserAuthModuleMutation` | Mutation | Update a userAuthModule |
| `useDeleteUserAuthModuleMutation` | Mutation | Delete a userAuthModule |
| `useDbUsageModulesQuery` | Query | List all dbUsageModules |
| `useDbUsageModuleQuery` | Query | Get one dbUsageModule |
| `useCreateDbUsageModuleMutation` | Mutation | Create a dbUsageModule |
| `useUpdateDbUsageModuleMutation` | Mutation | Update a dbUsageModule |
| `useDeleteDbUsageModuleMutation` | Mutation | Delete a dbUsageModule |
| `useAgentModulesQuery` | Query | List all agentModules |
| `useAgentModuleQuery` | Query | Get one agentModule |
| `useCreateAgentModuleMutation` | Mutation | Create a agentModule |
| `useUpdateAgentModuleMutation` | Mutation | Update a agentModule |
| `useDeleteAgentModuleMutation` | Mutation | Delete a agentModule |
| `useLimitsModulesQuery` | Query | List all limitsModules |
| `useLimitsModuleQuery` | Query | Get one limitsModule |
| `useCreateLimitsModuleMutation` | Mutation | Create a limitsModule |
| `useUpdateLimitsModuleMutation` | Mutation | Update a limitsModule |
| `useDeleteLimitsModuleMutation` | Mutation | Delete a limitsModule |
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
| `useStorageModulesQuery` | Query | List all storageModules |
| `useStorageModuleQuery` | Query | Get one storageModule |
| `useCreateStorageModuleMutation` | Mutation | Create a storageModule |
| `useUpdateStorageModuleMutation` | Mutation | Update a storageModule |
| `useDeleteStorageModuleMutation` | Mutation | Delete a storageModule |
| `useMembershipsModulesQuery` | Query | List all membershipsModules |
| `useMembershipsModuleQuery` | Query | Get one membershipsModule |
| `useCreateMembershipsModuleMutation` | Mutation | Create a membershipsModule |
| `useUpdateMembershipsModuleMutation` | Mutation | Update a membershipsModule |
| `useDeleteMembershipsModuleMutation` | Mutation | Delete a membershipsModule |
| `useEventsModulesQuery` | Query | List all eventsModules |
| `useEventsModuleQuery` | Query | Get one eventsModule |
| `useCreateEventsModuleMutation` | Mutation | Create a eventsModule |
| `useUpdateEventsModuleMutation` | Mutation | Update a eventsModule |
| `useDeleteEventsModuleMutation` | Mutation | Delete a eventsModule |
| `useResolveBlueprintFieldQuery` | Query | Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this. |
| `useResolveBlueprintTableQuery` | Query | Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error. |
| `useConstructBlueprintMutation` | Mutation | Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When function_module is installed, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure. |
| `useProvisionFullTextSearchMutation` | Mutation | Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id. |
| `useProvisionIndexMutation` | Mutation | Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id. |
| `useProvisionCheckConstraintMutation` | Mutation | Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists. |
| `useProvisionUniqueConstraintMutation` | Mutation | Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists. |
| `useCopyTemplateToBlueprintMutation` | Mutation | Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID. |
| `useProvisionSpatialRelationMutation` | Mutation | Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert. |
| `useProvisionTableMutation` | Mutation | Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields). |
| `useProvisionRelationMutation` | Mutation | Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id). |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

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

### I18NModule

```typescript
// List all i18nModules
const { data, isLoading } = useI18nModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, settingsTableId: true, apiName: true, privateApiName: true } },
});

// Get one i18NModule
const { data: item } = useI18NModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, settingsTableId: true, apiName: true, privateApiName: true } },
});

// Create a i18NModule
const { mutate: create } = useCreateI18NModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', settingsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```

### UserSettingsModule

```typescript
// List all userSettingsModules
const { data, isLoading } = useUserSettingsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true } },
});

// Get one userSettingsModule
const { data: item } = useUserSettingsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true } },
});

// Create a userSettingsModule
const { mutate: create } = useCreateUserSettingsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>' });
```

### UserStateModule

```typescript
// List all userStateModules
const { data, isLoading } = useUserStateModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one userStateModule
const { data: item } = useUserStateModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a userStateModule
const { mutate: create } = useCreateUserStateModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```

### UserCredentialsModule

```typescript
// List all userCredentialsModules
const { data, isLoading } = useUserCredentialsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true, privateApiName: true } },
});

// Get one userCredentialsModule
const { data: item } = useUserCredentialsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true, privateApiName: true } },
});

// Create a userCredentialsModule
const { mutate: create } = useCreateUserCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', privateApiName: '<String>' });
```

### ConnectedAccountsModule

```typescript
// List all connectedAccountsModules
const { data, isLoading } = useConnectedAccountsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Get one connectedAccountsModule
const { data: item } = useConnectedAccountsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Create a connectedAccountsModule
const { mutate: create } = useCreateConnectedAccountsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### EmailsModule

```typescript
// List all emailsModules
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Get one emailsModule
const { data: item } = useEmailsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Create a emailsModule
const { mutate: create } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### PhoneNumbersModule

```typescript
// List all phoneNumbersModules
const { data, isLoading } = usePhoneNumbersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Get one phoneNumbersModule
const { data: item } = usePhoneNumbersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Create a phoneNumbersModule
const { mutate: create } = useCreatePhoneNumbersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
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

### UsersModule

```typescript
// List all usersModules
const { data, isLoading } = useUsersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true, apiName: true, privateApiName: true } },
});

// Get one usersModule
const { data: item } = useUsersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true, apiName: true, privateApiName: true } },
});

// Create a usersModule
const { mutate: create } = useCreateUsersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', typeTableId: '<UUID>', typeTableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### WebauthnCredentialsModule

```typescript
// List all webauthnCredentialsModules
const { data, isLoading } = useWebauthnCredentialsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Get one webauthnCredentialsModule
const { data: item } = useWebauthnCredentialsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Create a webauthnCredentialsModule
const { mutate: create } = useCreateWebauthnCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### ConfigSecretsUserModule

```typescript
// List all configSecretsUserModules
const { data, isLoading } = useConfigSecretsUserModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Get one configSecretsUserModule
const { data: item } = useConfigSecretsUserModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } },
});

// Create a configSecretsUserModule
const { mutate: create } = useCreateConfigSecretsUserModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### CryptoAddressesModule

```typescript
// List all cryptoAddressesModules
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, apiName: true, privateApiName: true } },
});

// Get one cryptoAddressesModule
const { data: item } = useCryptoAddressesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, apiName: true, privateApiName: true } },
});

// Create a cryptoAddressesModule
const { mutate: create } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', cryptoNetwork: '<String>', apiName: '<String>', privateApiName: '<String>' });
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

### RlsModule

```typescript
// List all rlsModules
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, apiName: true, privateApiName: true } },
});

// Get one rlsModule
const { data: item } = useRlsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, apiName: true, privateApiName: true } },
});

// Create a rlsModule
const { mutate: create } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>', apiName: '<String>', privateApiName: '<String>' });
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

### IdentityProvidersModule

```typescript
// List all identityProvidersModules
const { data, isLoading } = useIdentityProvidersModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } },
});

// Get one identityProvidersModule
const { data: item } = useIdentityProvidersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } },
});

// Create a identityProvidersModule
const { mutate: create } = useCreateIdentityProvidersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' });
```

### IntegrationProvidersModule

```typescript
// List all integrationProvidersModules
const { data, isLoading } = useIntegrationProvidersModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } },
});

// Get one integrationProvidersModule
const { data: item } = useIntegrationProvidersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } },
});

// Create a integrationProvidersModule
const { mutate: create } = useCreateIntegrationProvidersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' });
```

### DbPoolConfig

```typescript
// List all dbPoolConfigs
const { data, isLoading } = useDbPoolConfigsQuery({
  selection: { fields: { id: true, presetSlug: true, domain: true, poolOwnerId: true, min: true, max: true, warmTtl: true, enabled: true, createdAt: true, updatedAt: true } },
});

// Get one dbPoolConfig
const { data: item } = useDbPoolConfigQuery({
  id: '<UUID>',
  selection: { fields: { id: true, presetSlug: true, domain: true, poolOwnerId: true, min: true, max: true, warmTtl: true, enabled: true, createdAt: true, updatedAt: true } },
});

// Create a dbPoolConfig
const { mutate: create } = useCreateDbPoolConfigMutation({
  selection: { fields: { id: true } },
});
create({ presetSlug: '<String>', domain: '<String>', poolOwnerId: '<UUID>', min: '<Int>', max: '<Int>', warmTtl: '<Interval>', enabled: '<Boolean>' });
```

### RealtimeModule

```typescript
// List all realtimeModules
const { data, isLoading } = useRealtimeModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true, apiName: true, privateApiName: true } },
});

// Get one realtimeModule
const { data: item } = useRealtimeModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, subscriptionsSchemaId: true, changeLogTableId: true, listenerNodeTableId: true, sourceRegistryTableId: true, retentionHours: true, premake: true, interval: true, notifyChannel: true, apiName: true, privateApiName: true } },
});

// Create a realtimeModule
const { mutate: create } = useCreateRealtimeModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', subscriptionsSchemaId: '<UUID>', changeLogTableId: '<UUID>', listenerNodeTableId: '<UUID>', sourceRegistryTableId: '<UUID>', retentionHours: '<Int>', premake: '<Int>', interval: '<String>', notifyChannel: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### InfraSecretsModule

```typescript
// List all infraSecretsModules
const { data, isLoading } = useInfraSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, secretsTableId: true, secretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } },
});

// Get one infraSecretsModule
const { data: item } = useInfraSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, secretsTableId: true, secretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } },
});

// Create a infraSecretsModule
const { mutate: create } = useCreateInfraSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' });
```

### InternalSecretsModule

```typescript
// List all internalSecretsModules
const { data, isLoading } = useInternalSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, internalSecretsTableId: true, internalSecretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } },
});

// Get one internalSecretsModule
const { data: item } = useInternalSecretsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, internalSecretsTableId: true, internalSecretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } },
});

// Create a internalSecretsModule
const { mutate: create } = useCreateInternalSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' });
```

### DbPresetModule

```typescript
// List all dbPresetModules
const { data, isLoading } = useDbPresetModulesQuery({
  selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, dbPresetsTableId: true, storeName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, createdAt: true } },
});

// Get one dbPresetModule
const { data: item } = useDbPresetModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, dbPresetsTableId: true, storeName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, createdAt: true } },
});

// Create a dbPresetModule
const { mutate: create } = useCreateDbPresetModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', scope: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', dbPresetsTableId: '<UUID>', storeName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' });
```

### GraphModule

```typescript
// List all graphModules
const { data, isLoading } = useGraphModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, graphsTableId: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } },
});

// Get one graphModule
const { data: item } = useGraphModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, graphsTableId: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } },
});

// Create a graphModule
const { mutate: create } = useCreateGraphModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', scope: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', graphsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### RateLimitMetersModule

```typescript
// List all rateLimitMetersModules
const { data, isLoading } = useRateLimitMetersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Get one rateLimitMetersModule
const { data: item } = useRateLimitMetersModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Create a rateLimitMetersModule
const { mutate: create } = useCreateRateLimitMetersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', checkRateLimitFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### InfraConfigModule

```typescript
// List all infraConfigModules
const { data, isLoading } = useInfraConfigModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, configTableId: true, configTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true } },
});

// Get one infraConfigModule
const { data: item } = useInfraConfigModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, configTableId: true, configTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true } },
});

// Create a infraConfigModule
const { mutate: create } = useCreateInfraConfigModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', configTableId: '<UUID>', configTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' });
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

### PrincipalAuthModule

```typescript
// List all principalAuthModules
const { data, isLoading } = usePrincipalAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, principalsTableId: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, usersTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, principalsTableName: true, createPrincipalFunction: true, deletePrincipalFunction: true, createOrgPrincipalFunction: true, deleteOrgPrincipalFunction: true, createOrgApiKeyFunction: true, revokeOrgApiKeyFunction: true, apiName: true } },
});

// Get one principalAuthModule
const { data: item } = usePrincipalAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, principalsTableId: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, usersTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, principalsTableName: true, createPrincipalFunction: true, deletePrincipalFunction: true, createOrgPrincipalFunction: true, deleteOrgPrincipalFunction: true, createOrgApiKeyFunction: true, revokeOrgApiKeyFunction: true, apiName: true } },
});

// Create a principalAuthModule
const { mutate: create } = useCreatePrincipalAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', principalsTableId: '<UUID>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', usersTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', principalsTableName: '<String>', createPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', createOrgPrincipalFunction: '<String>', deleteOrgPrincipalFunction: '<String>', createOrgApiKeyFunction: '<String>', revokeOrgApiKeyFunction: '<String>', apiName: '<String>' });
```

### DbPool

```typescript
// List all dbPools
const { data, isLoading } = useDbPoolsQuery({
  selection: { fields: { id: true, presetSlug: true, presetCommitId: true, databaseId: true, status: true, errorMessage: true, expiresAt: true, claimedBy: true, claimedAt: true, bootstrapStatus: true, bootstrapError: true, createdAt: true, updatedAt: true } },
});

// Get one dbPool
const { data: item } = useDbPoolQuery({
  id: '<UUID>',
  selection: { fields: { id: true, presetSlug: true, presetCommitId: true, databaseId: true, status: true, errorMessage: true, expiresAt: true, claimedBy: true, claimedAt: true, bootstrapStatus: true, bootstrapError: true, createdAt: true, updatedAt: true } },
});

// Create a dbPool
const { mutate: create } = useCreateDbPoolMutation({
  selection: { fields: { id: true } },
});
create({ presetSlug: '<String>', presetCommitId: '<UUID>', databaseId: '<UUID>', status: '<String>', errorMessage: '<String>', expiresAt: '<Datetime>', claimedBy: '<UUID>', claimedAt: '<Datetime>', bootstrapStatus: '<String>', bootstrapError: '<String>' });
```

### FunctionModule

```typescript
// List all functionModules
const { data, isLoading } = useFunctionModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, definitionsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Get one functionModule
const { data: item } = useFunctionModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, definitionsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Create a functionModule
const { mutate: create } = useCreateFunctionModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', definitionsTableId: '<UUID>', definitionsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### MerkleStoreModule

```typescript
// List all merkleStoreModules
const { data, isLoading } = useMerkleStoreModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, objectTableId: true, storeTableId: true, commitTableId: true, refTableId: true, prefix: true, apiName: true, privateApiName: true, scope: true, functionPrefix: true, permissionKey: true, createdAt: true } },
});

// Get one merkleStoreModule
const { data: item } = useMerkleStoreModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, objectTableId: true, storeTableId: true, commitTableId: true, refTableId: true, prefix: true, apiName: true, privateApiName: true, scope: true, functionPrefix: true, permissionKey: true, createdAt: true } },
});

// Create a merkleStoreModule
const { mutate: create } = useCreateMerkleStoreModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', objectTableId: '<UUID>', storeTableId: '<UUID>', commitTableId: '<UUID>', refTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', functionPrefix: '<String>', permissionKey: '<String>' });
```

### DatabaseProvisionModule

```typescript
// List all databaseProvisionModules
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, sourceDatabaseId: true, bootstrapStatus: true, bootstrapError: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true, fulfilledAt: true } },
});

// Get one databaseProvisionModule
const { data: item } = useDatabaseProvisionModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, sourceDatabaseId: true, bootstrapStatus: true, bootstrapError: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true, fulfilledAt: true } },
});

// Create a databaseProvisionModule
const { mutate: create } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseName: '<String>', ownerId: '<UUID>', subdomain: '<String>', domain: '<String>', modules: '<JSON>', options: '<JSON>', bootstrapUser: '<Boolean>', status: '<String>', errorMessage: '<String>', sourceDatabaseId: '<UUID>', bootstrapStatus: '<String>', bootstrapError: '<String>', databaseId: '<UUID>', completedAt: '<Datetime>', fulfilledAt: '<Datetime>' });
```

### FunctionInvocationModule

```typescript
// List all functionInvocationModules
const { data, isLoading } = useFunctionInvocationModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, invocationsTableId: true, executionLogsTableId: true, invocationsTableName: true, executionLogsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Get one functionInvocationModule
const { data: item } = useFunctionInvocationModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, invocationsTableId: true, executionLogsTableId: true, invocationsTableName: true, executionLogsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Create a functionInvocationModule
const { mutate: create } = useCreateFunctionInvocationModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', invocationsTableName: '<String>', executionLogsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### InvitesModule

```typescript
// List all invitesModules
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, scope: true, prefix: true, entityTableId: true, apiName: true, privateApiName: true } },
});

// Get one invitesModule
const { data: item } = useInvitesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, scope: true, prefix: true, entityTableId: true, apiName: true, privateApiName: true } },
});

// Create a invitesModule
const { mutate: create } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', emailsTableId: '<UUID>', usersTableId: '<UUID>', invitesTableId: '<UUID>', claimedInvitesTableId: '<UUID>', invitesTableName: '<String>', claimedInvitesTableName: '<String>', submitInviteCodeFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```

### NamespaceModule

```typescript
// List all namespaceModules
const { data, isLoading } = useNamespaceModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, namespacesTableId: true, namespaceEventsTableId: true, namespacesTableName: true, namespaceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Get one namespaceModule
const { data: item } = useNamespaceModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, namespacesTableId: true, namespaceEventsTableId: true, namespacesTableName: true, namespaceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Create a namespaceModule
const { mutate: create } = useCreateNamespaceModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', namespacesTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespacesTableName: '<String>', namespaceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### PlansModule

```typescript
// List all plansModules
const { data, isLoading } = usePlansModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, planMeterLimitsTableId: true, planCapsTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, applyBillingPlanFunction: true, applyPlanCapsFunction: true, prefix: true, apiName: true, privateApiName: true } },
});

// Get one plansModule
const { data: item } = usePlansModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, planMeterLimitsTableId: true, planCapsTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, applyBillingPlanFunction: true, applyPlanCapsFunction: true, prefix: true, apiName: true, privateApiName: true } },
});

// Create a plansModule
const { mutate: create } = useCreatePlansModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', plansTableId: '<UUID>', plansTableName: '<String>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planPricingTableId: '<UUID>', planOverridesTableId: '<UUID>', planMeterLimitsTableId: '<UUID>', planCapsTableId: '<UUID>', applyPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', applyBillingPlanFunction: '<String>', applyPlanCapsFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### ComputeLogModule

```typescript
// List all computeLogModules
const { data, isLoading } = useComputeLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Get one computeLogModule
const { data: item } = useComputeLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Create a computeLogModule
const { mutate: create } = useCreateComputeLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### InferenceLogModule

```typescript
// List all inferenceLogModules
const { data, isLoading } = useInferenceLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Get one inferenceLogModule
const { data: item } = useInferenceLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Create a inferenceLogModule
const { mutate: create } = useCreateInferenceLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### StorageLogModule

```typescript
// List all storageLogModules
const { data, isLoading } = useStorageLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Get one storageLogModule
const { data: item } = useStorageLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Create a storageLogModule
const { mutate: create } = useCreateStorageLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### TransferLogModule

```typescript
// List all transferLogModules
const { data, isLoading } = useTransferLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Get one transferLogModule
const { data: item } = useTransferLogModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});

// Create a transferLogModule
const { mutate: create } = useCreateTransferLogModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### BillingProviderModule

```typescript
// List all billingProviderModules
const { data, isLoading } = useBillingProviderModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true, apiName: true, privateApiName: true } },
});

// Get one billingProviderModule
const { data: item } = useBillingProviderModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, provider: true, productsTableId: true, pricesTableId: true, subscriptionsTableId: true, billingCustomersTableId: true, billingCustomersTableName: true, billingProductsTableId: true, billingProductsTableName: true, billingPricesTableId: true, billingPricesTableName: true, billingSubscriptionsTableId: true, billingSubscriptionsTableName: true, billingWebhookEventsTableId: true, billingWebhookEventsTableName: true, processBillingEventFunction: true, prefix: true, apiName: true, privateApiName: true } },
});

// Create a billingProviderModule
const { mutate: create } = useCreateBillingProviderModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', provider: '<String>', productsTableId: '<UUID>', pricesTableId: '<UUID>', subscriptionsTableId: '<UUID>', billingCustomersTableId: '<UUID>', billingCustomersTableName: '<String>', billingProductsTableId: '<UUID>', billingProductsTableName: '<String>', billingPricesTableId: '<UUID>', billingPricesTableName: '<String>', billingSubscriptionsTableId: '<UUID>', billingSubscriptionsTableName: '<String>', billingWebhookEventsTableId: '<UUID>', billingWebhookEventsTableName: '<String>', processBillingEventFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### FunctionDeploymentModule

```typescript
// List all functionDeploymentModules
const { data, isLoading } = useFunctionDeploymentModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, deploymentsTableId: true, deploymentEventsTableId: true, deploymentsTableName: true, deploymentEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, functionModuleId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Get one functionDeploymentModule
const { data: item } = useFunctionDeploymentModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, deploymentsTableId: true, deploymentEventsTableId: true, deploymentsTableName: true, deploymentEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, functionModuleId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Create a functionDeploymentModule
const { mutate: create } = useCreateFunctionDeploymentModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', deploymentsTableId: '<UUID>', deploymentEventsTableId: '<UUID>', deploymentsTableName: '<String>', deploymentEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### PermissionsModule

```typescript
// List all permissionsModules
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, apiName: true, privateApiName: true } },
});

// Get one permissionsModule
const { data: item } = usePermissionsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true, apiName: true, privateApiName: true } },
});

// Create a permissionsModule
const { mutate: create } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', bitlen: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', getPaddedMask: '<String>', getMask: '<String>', getByMask: '<String>', getMaskByName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### GraphExecutionModule

```typescript
// List all graphExecutionModules
const { data, isLoading } = useGraphExecutionModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, graphModuleId: true, scope: true, prefix: true, executionsTableId: true, outputsTableId: true, nodeStatesTableId: true, executionsTableName: true, outputsTableName: true, nodeStatesTableName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } },
});

// Get one graphExecutionModule
const { data: item } = useGraphExecutionModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, graphModuleId: true, scope: true, prefix: true, executionsTableId: true, outputsTableId: true, nodeStatesTableId: true, executionsTableName: true, outputsTableName: true, nodeStatesTableName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } },
});

// Create a graphExecutionModule
const { mutate: create } = useCreateGraphExecutionModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', graphModuleId: '<UUID>', scope: '<String>', prefix: '<String>', executionsTableId: '<UUID>', outputsTableId: '<UUID>', nodeStatesTableId: '<UUID>', executionsTableName: '<String>', outputsTableName: '<String>', nodeStatesTableName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### HierarchyModule

```typescript
// List all hierarchyModules
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, scope: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, defaultPermissions: true, createdAt: true } },
});

// Get one hierarchyModule
const { data: item } = useHierarchyModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, scope: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, defaultPermissions: true, createdAt: true } },
});

// Create a hierarchyModule
const { mutate: create } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', entityTableId: '<UUID>', usersTableId: '<UUID>', scope: '<String>', prefix: '<String>', privateSchemaName: '<String>', sprtTableName: '<String>', rebuildHierarchyFunction: '<String>', getSubordinatesFunction: '<String>', getManagersFunction: '<String>', isManagerOfFunction: '<String>', defaultPermissions: '<String>' });
```

### NotificationsModule

```typescript
// List all notificationsModules
const { data, isLoading } = useNotificationsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, suppressionsTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Get one notificationsModule
const { data: item } = useNotificationsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, suppressionsTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Create a notificationsModule
const { mutate: create } = useCreateNotificationsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', notificationsTableId: '<UUID>', readStateTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', suppressionsTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', hasChannels: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasDigestMetadata: '<Boolean>', hasSubscriptions: '<Boolean>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
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

### ProfilesModule

```typescript
// List all profilesModules
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, apiName: true, privateApiName: true } },
});

// Get one profilesModule
const { data: item } = useProfilesModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, profileTemplatesTableId: true, profileTemplatesTableName: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, apiName: true, privateApiName: true } },
});

// Create a profilesModule
const { mutate: create } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```

### BillingModule

```typescript
// List all billingModules
const { data, isLoading } = useBillingModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, recordUsageFunction: true, sweepExpiredSubscriptionsFunction: true, rollupUsageSummaryFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Get one billingModule
const { data: item } = useBillingModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, metersTableId: true, metersTableName: true, planSubscriptionsTableId: true, planSubscriptionsTableName: true, ledgerTableId: true, ledgerTableName: true, balancesTableId: true, balancesTableName: true, meterCreditsTableId: true, meterCreditsTableName: true, meterSourcesTableId: true, meterSourcesTableName: true, meterDefaultsTableId: true, meterDefaultsTableName: true, recordUsageFunction: true, sweepExpiredSubscriptionsFunction: true, rollupUsageSummaryFunction: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Create a billingModule
const { mutate: create } = useCreateBillingModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', metersTableId: '<UUID>', metersTableName: '<String>', planSubscriptionsTableId: '<UUID>', planSubscriptionsTableName: '<String>', ledgerTableId: '<UUID>', ledgerTableName: '<String>', balancesTableId: '<UUID>', balancesTableName: '<String>', meterCreditsTableId: '<UUID>', meterCreditsTableName: '<String>', meterSourcesTableId: '<UUID>', meterSourcesTableName: '<String>', meterDefaultsTableId: '<UUID>', meterDefaultsTableName: '<String>', recordUsageFunction: '<String>', sweepExpiredSubscriptionsFunction: '<String>', rollupUsageSummaryFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### ResourceModule

```typescript
// List all resourceModules
const { data, isLoading } = useResourceModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourceStatusChecksTableId: true, resourceDefinitionsTableId: true, resourcesTableName: true, resourceEventsTableName: true, resourceStatusChecksTableName: true, resourceDefinitionsTableName: true, resolvedRequirementsViewName: true, requirementsStateViewName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Get one resourceModule
const { data: item } = useResourceModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourceStatusChecksTableId: true, resourceDefinitionsTableId: true, resourcesTableName: true, resourceEventsTableName: true, resourceStatusChecksTableName: true, resourceDefinitionsTableName: true, resolvedRequirementsViewName: true, requirementsStateViewName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } },
});

// Create a resourceModule
const { mutate: create } = useCreateResourceModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', resourcesTableId: '<UUID>', resourceEventsTableId: '<UUID>', resourceStatusChecksTableId: '<UUID>', resourceDefinitionsTableId: '<UUID>', resourcesTableName: '<String>', resourceEventsTableName: '<String>', resourceStatusChecksTableName: '<String>', resourceDefinitionsTableName: '<String>', resolvedRequirementsViewName: '<String>', requirementsStateViewName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### UserAuthModule

```typescript
// List all userAuthModules
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true, apiName: true, privateApiName: true } },
});

// Get one userAuthModule
const { data: item } = useUserAuthModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInCrossOriginFunction: true, requestCrossOriginTokenFunction: true, extendTokenExpires: true, apiName: true, privateApiName: true } },
});

// Create a userAuthModule
const { mutate: create } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInCrossOriginFunction: '<String>', requestCrossOriginTokenFunction: '<String>', extendTokenExpires: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### DbUsageModule

```typescript
// List all dbUsageModules
const { data, isLoading } = useDbUsageModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, collectDbTableStatsFunction: true, collectDbQueryStatsFunction: true, rollupDbTableStatsDailyFunction: true, rollupDbQueryStatsDailyFunction: true, interval: true, retention: true, premake: true, scope: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Get one dbUsageModule
const { data: item } = useDbUsageModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, collectDbTableStatsFunction: true, collectDbQueryStatsFunction: true, rollupDbTableStatsDailyFunction: true, rollupDbQueryStatsDailyFunction: true, interval: true, retention: true, premake: true, scope: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Create a dbUsageModule
const { mutate: create } = useCreateDbUsageModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', collectDbTableStatsFunction: '<String>', collectDbQueryStatsFunction: '<String>', rollupDbTableStatsDailyFunction: '<String>', rollupDbQueryStatsDailyFunction: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### AgentModule

```typescript
// List all agentModules
const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, planTableId: true, agentTableId: true, personaTableId: true, resourceTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, planTableName: true, agentTableName: true, personaTableName: true, resourceTableName: true, hasPlans: true, hasResources: true, hasAgents: true, shared: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, resources: true, provisions: true, defaultPermissions: true } },
});

// Get one agentModule
const { data: item } = useAgentModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, planTableId: true, agentTableId: true, personaTableId: true, resourceTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, planTableName: true, agentTableName: true, personaTableName: true, resourceTableName: true, hasPlans: true, hasResources: true, hasAgents: true, shared: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, resources: true, provisions: true, defaultPermissions: true } },
});

// Create a agentModule
const { mutate: create } = useCreateAgentModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', planTableId: '<UUID>', agentTableId: '<UUID>', personaTableId: '<UUID>', resourceTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', planTableName: '<String>', agentTableName: '<String>', personaTableName: '<String>', resourceTableName: '<String>', hasPlans: '<Boolean>', hasResources: '<Boolean>', hasAgents: '<Boolean>', shared: '<Boolean>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', resources: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```

### LimitsModule

```typescript
// List all limitsModules
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, apiName: true, privateApiName: true } },
});

// Get one limitsModule
const { data: item } = useLimitsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, limitCreditsTableId: true, eventsTableId: true, creditCodesTableId: true, creditCodeItemsTableId: true, creditRedemptionsTableId: true, aggregateTableId: true, limitCapsTableId: true, limitCapsDefaultsTableId: true, capCheckTrigger: true, resolveCapFunction: true, limitWarningsTableId: true, limitWarningStateTableId: true, limitCheckSoftFunction: true, limitAggregateCheckSoftFunction: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, apiName: true, privateApiName: true } },
});

// Create a limitsModule
const { mutate: create } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', limitCreditsTableId: '<UUID>', eventsTableId: '<UUID>', creditCodesTableId: '<UUID>', creditCodeItemsTableId: '<UUID>', creditRedemptionsTableId: '<UUID>', aggregateTableId: '<UUID>', limitCapsTableId: '<UUID>', limitCapsDefaultsTableId: '<UUID>', capCheckTrigger: '<String>', resolveCapFunction: '<String>', limitWarningsTableId: '<UUID>', limitWarningStateTableId: '<UUID>', limitCheckSoftFunction: '<String>', limitAggregateCheckSoftFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```

### EntityTypeProvision

```typescript
// List all entityTypeProvisions
const { data, isLoading } = useEntityTypeProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasInvites: true, hasInviteAchievements: true, storage: true, namespaces: true, functions: true, graphs: true, agents: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outNamespaceEventsTableId: true, outFunctionModuleId: true, outDefinitionsTableId: true, outInvocationsTableId: true, outExecutionLogsTableId: true, outGraphModuleId: true, outGraphsTableId: true, outAgentModuleId: true } },
});

// Get one entityTypeProvision
const { data: item } = useEntityTypeProvisionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, name: true, prefix: true, description: true, parentEntity: true, tableName: true, isVisible: true, hasLimits: true, hasProfiles: true, hasLevels: true, hasInvites: true, hasInviteAchievements: true, storage: true, namespaces: true, functions: true, graphs: true, agents: true, skipEntityPolicies: true, tableProvision: true, outMembershipType: true, outEntityTableId: true, outEntityTableName: true, outInstalledModules: true, outStorageModuleId: true, outBucketsTableId: true, outFilesTableId: true, outPathSharesTableId: true, outInvitesModuleId: true, outNamespaceModuleId: true, outNamespacesTableId: true, outNamespaceEventsTableId: true, outFunctionModuleId: true, outDefinitionsTableId: true, outInvocationsTableId: true, outExecutionLogsTableId: true, outGraphModuleId: true, outGraphsTableId: true, outAgentModuleId: true } },
});

// Create a entityTypeProvision
const { mutate: create } = useCreateEntityTypeProvisionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', prefix: '<String>', description: '<String>', parentEntity: '<String>', tableName: '<String>', isVisible: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', hasLevels: '<Boolean>', hasInvites: '<Boolean>', hasInviteAchievements: '<Boolean>', storage: '<JSON>', namespaces: '<JSON>', functions: '<JSON>', graphs: '<JSON>', agents: '<JSON>', skipEntityPolicies: '<Boolean>', tableProvision: '<JSON>', outMembershipType: '<Int>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outInstalledModules: '<String>', outStorageModuleId: '<UUID>', outBucketsTableId: '<UUID>', outFilesTableId: '<UUID>', outPathSharesTableId: '<UUID>', outInvitesModuleId: '<UUID>', outNamespaceModuleId: '<UUID>', outNamespacesTableId: '<UUID>', outNamespaceEventsTableId: '<UUID>', outFunctionModuleId: '<UUID>', outDefinitionsTableId: '<UUID>', outInvocationsTableId: '<UUID>', outExecutionLogsTableId: '<UUID>', outGraphModuleId: '<UUID>', outGraphsTableId: '<UUID>', outAgentModuleId: '<UUID>' });
```

### StorageModule

```typescript
// List all storageModules
const { data, isLoading } = useStorageModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, scope: true, prefix: true, policies: true, provisions: true, entityTableId: true, entityField: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Get one storageModule
const { data: item } = useStorageModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, scope: true, prefix: true, policies: true, provisions: true, entityTableId: true, entityField: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Create a storageModule
const { mutate: create } = useCreateStorageModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', scope: '<String>', prefix: '<String>', policies: '<JSON>', provisions: '<JSON>', entityTableId: '<UUID>', entityField: '<String>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', restrictReads: '<Boolean>', hasPathShares: '<Boolean>', pathSharesTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', hasVersioning: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', confirmUploadDelay: '<Interval>', fileEventsTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

### MembershipsModule

```typescript
// List all membershipsModules
const { data, isLoading } = useMembershipsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, scope: true, prefix: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true, permissionDefaultPermissionsTableId: true, permissionDefaultGrantsTableId: true, apiName: true, privateApiName: true } },
});

// Get one membershipsModule
const { data: item } = useMembershipsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, membershipSettingsTableId: true, membershipSettingsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, scope: true, prefix: true, entityTableId: true, entityTableOwnerId: true, getOrgFn: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true, memberProfilesTableId: true, permissionDefaultPermissionsTableId: true, permissionDefaultGrantsTableId: true, apiName: true, privateApiName: true } },
});

// Create a membershipsModule
const { mutate: create } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', actorTableId: '<UUID>', limitsTableId: '<UUID>', defaultLimitsTableId: '<UUID>', permissionsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', sprtTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', getOrgFn: '<String>', actorMaskCheck: '<String>', actorPermCheck: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', memberProfilesTableId: '<UUID>', permissionDefaultPermissionsTableId: '<UUID>', permissionDefaultGrantsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```

### EventsModule

```typescript
// List all eventsModules
const { data, isLoading } = useEventsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Get one eventsModule
const { data: item } = useEventsModuleQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});

// Create a eventsModule
const { mutate: create } = useCreateEventsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', recordEvent: '<String>', removeEvent: '<String>', tgEvent: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgEventBool: '<String>', upsertAggregate: '<String>', tgUpdateAggregates: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', tgCheckAchievements: '<String>', grantAchievement: '<String>', tgAchievementReward: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```

## Custom Operation Hooks

### `useResolveBlueprintFieldQuery`

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `databaseId` | UUID |
  | `tableId` | UUID |
  | `fieldName` | String |

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

### `useConstructBlueprintMutation`

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Eight phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security. When a prefix already exists (e.g., 'org'), the entry extends the existing entity type instead of creating a new one; if a storage[] key is present, it provisions entity-scoped storage for that type. (0.5) scope-based storage: each storage[] entry has an optional scope ('app' or 'org' only). App-scoped storage seeds buckets at migration time. Org-scoped storage resolves the org membership type, creates org_buckets/org_files with owner_id, and seeds buckets per-entity via an AFTER INSERT trigger on the users table. When function_module is installed, a private functions bucket is auto-injected into org-scoped or entity-scoped storage entries. (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints/check_constraints are deferred). After provisioning, optional smart_tags (jsonb object) on the table entry are applied via metaschema.append_table_smart_tags(), and optional smart_tags on individual field entries are applied via metaschema.append_field_smart_tags(). (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints, (6) provision_check_constraint() for top-level + deferred check constraints, (7) seed achievements from definition.achievements[] — resolves events_module by entity_prefix and creates INSERT actions for levels, level_requirements, and achievement_rewards tables. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level entries are deferred to phases 3-6 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConstructBlueprintInput (required) |

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

### `useProvisionTableMutation`

Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionTableInput (required) |

### `useProvisionRelationMutation`

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionRelationInput (required) |

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
