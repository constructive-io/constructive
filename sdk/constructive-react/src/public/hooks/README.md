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
| `useGetAllQuery` | Query | List all getAll |
| `useCreateGetAllRecordMutation` | Mutation | Create a getAllRecord |
| `useAppPermissionsQuery` | Query | List all appPermissions |
| `useAppPermissionQuery` | Query | Get one appPermission |
| `useCreateAppPermissionMutation` | Mutation | Create a appPermission |
| `useUpdateAppPermissionMutation` | Mutation | Update a appPermission |
| `useDeleteAppPermissionMutation` | Mutation | Delete a appPermission |
| `useOrgPermissionsQuery` | Query | List all orgPermissions |
| `useOrgPermissionQuery` | Query | Get one orgPermission |
| `useCreateOrgPermissionMutation` | Mutation | Create a orgPermission |
| `useUpdateOrgPermissionMutation` | Mutation | Update a orgPermission |
| `useDeleteOrgPermissionMutation` | Mutation | Delete a orgPermission |
| `useObjectsQuery` | Query | List all objects |
| `useObjectQuery` | Query | Get one object |
| `useCreateObjectMutation` | Mutation | Create a object |
| `useUpdateObjectMutation` | Mutation | Update a object |
| `useDeleteObjectMutation` | Mutation | Delete a object |
| `useAppLevelRequirementsQuery` | Query | List all appLevelRequirements |
| `useAppLevelRequirementQuery` | Query | Get one appLevelRequirement |
| `useCreateAppLevelRequirementMutation` | Mutation | Create a appLevelRequirement |
| `useUpdateAppLevelRequirementMutation` | Mutation | Update a appLevelRequirement |
| `useDeleteAppLevelRequirementMutation` | Mutation | Delete a appLevelRequirement |
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
| `useLimitFunctionsQuery` | Query | List all limitFunctions |
| `useLimitFunctionQuery` | Query | Get one limitFunction |
| `useCreateLimitFunctionMutation` | Mutation | Create a limitFunction |
| `useUpdateLimitFunctionMutation` | Mutation | Update a limitFunction |
| `useDeleteLimitFunctionMutation` | Mutation | Delete a limitFunction |
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
| `useViewTablesQuery` | Query | List all viewTables |
| `useViewTableQuery` | Query | Get one viewTable |
| `useCreateViewTableMutation` | Mutation | Create a viewTable |
| `useUpdateViewTableMutation` | Mutation | Update a viewTable |
| `useDeleteViewTableMutation` | Mutation | Delete a viewTable |
| `useViewGrantsQuery` | Query | List all viewGrants |
| `useViewGrantQuery` | Query | Get one viewGrant |
| `useCreateViewGrantMutation` | Mutation | Create a viewGrant |
| `useUpdateViewGrantMutation` | Mutation | Update a viewGrant |
| `useDeleteViewGrantMutation` | Mutation | Delete a viewGrant |
| `useViewRulesQuery` | Query | List all viewRules |
| `useViewRuleQuery` | Query | Get one viewRule |
| `useCreateViewRuleMutation` | Mutation | Create a viewRule |
| `useUpdateViewRuleMutation` | Mutation | Update a viewRule |
| `useDeleteViewRuleMutation` | Mutation | Delete a viewRule |
| `useTableModulesQuery` | Query | List all tableModules |
| `useTableModuleQuery` | Query | Get one tableModule |
| `useCreateTableModuleMutation` | Mutation | Create a tableModule |
| `useUpdateTableModuleMutation` | Mutation | Update a tableModule |
| `useDeleteTableModuleMutation` | Mutation | Delete a tableModule |
| `useTableTemplateModulesQuery` | Query | List all tableTemplateModules |
| `useTableTemplateModuleQuery` | Query | Get one tableTemplateModule |
| `useCreateTableTemplateModuleMutation` | Mutation | Create a tableTemplateModule |
| `useUpdateTableTemplateModuleMutation` | Mutation | Update a tableTemplateModule |
| `useDeleteTableTemplateModuleMutation` | Mutation | Delete a tableTemplateModule |
| `useSchemaGrantsQuery` | Query | List all schemaGrants |
| `useSchemaGrantQuery` | Query | Get one schemaGrant |
| `useCreateSchemaGrantMutation` | Mutation | Create a schemaGrant |
| `useUpdateSchemaGrantMutation` | Mutation | Update a schemaGrant |
| `useDeleteSchemaGrantMutation` | Mutation | Delete a schemaGrant |
| `useApiSchemasQuery` | Query | List all apiSchemas |
| `useApiSchemaQuery` | Query | Get one apiSchema |
| `useCreateApiSchemaMutation` | Mutation | Create a apiSchema |
| `useUpdateApiSchemaMutation` | Mutation | Update a apiSchema |
| `useDeleteApiSchemaMutation` | Mutation | Delete a apiSchema |
| `useApiModulesQuery` | Query | List all apiModules |
| `useApiModuleQuery` | Query | Get one apiModule |
| `useCreateApiModuleMutation` | Mutation | Create a apiModule |
| `useUpdateApiModuleMutation` | Mutation | Update a apiModule |
| `useDeleteApiModuleMutation` | Mutation | Delete a apiModule |
| `useDomainsQuery` | Query | List all domains |
| `useDomainQuery` | Query | Get one domain |
| `useCreateDomainMutation` | Mutation | Create a domain |
| `useUpdateDomainMutation` | Mutation | Update a domain |
| `useDeleteDomainMutation` | Mutation | Delete a domain |
| `useSiteMetadataQuery` | Query | List all siteMetadata |
| `useSiteMetadatumQuery` | Query | Get one siteMetadatum |
| `useCreateSiteMetadatumMutation` | Mutation | Create a siteMetadatum |
| `useUpdateSiteMetadatumMutation` | Mutation | Update a siteMetadatum |
| `useDeleteSiteMetadatumMutation` | Mutation | Delete a siteMetadatum |
| `useSiteModulesQuery` | Query | List all siteModules |
| `useSiteModuleQuery` | Query | Get one siteModule |
| `useCreateSiteModuleMutation` | Mutation | Create a siteModule |
| `useUpdateSiteModuleMutation` | Mutation | Update a siteModule |
| `useDeleteSiteModuleMutation` | Mutation | Delete a siteModule |
| `useSiteThemesQuery` | Query | List all siteThemes |
| `useSiteThemeQuery` | Query | Get one siteTheme |
| `useCreateSiteThemeMutation` | Mutation | Create a siteTheme |
| `useUpdateSiteThemeMutation` | Mutation | Update a siteTheme |
| `useDeleteSiteThemeMutation` | Mutation | Delete a siteTheme |
| `useProceduresQuery` | Query | List all procedures |
| `useProcedureQuery` | Query | Get one procedure |
| `useCreateProcedureMutation` | Mutation | Create a procedure |
| `useUpdateProcedureMutation` | Mutation | Update a procedure |
| `useDeleteProcedureMutation` | Mutation | Delete a procedure |
| `useTriggerFunctionsQuery` | Query | List all triggerFunctions |
| `useTriggerFunctionQuery` | Query | Get one triggerFunction |
| `useCreateTriggerFunctionMutation` | Mutation | Create a triggerFunction |
| `useUpdateTriggerFunctionMutation` | Mutation | Update a triggerFunction |
| `useDeleteTriggerFunctionMutation` | Mutation | Delete a triggerFunction |
| `useApisQuery` | Query | List all apis |
| `useApiQuery` | Query | Get one api |
| `useCreateApiMutation` | Mutation | Create a api |
| `useUpdateApiMutation` | Mutation | Update a api |
| `useDeleteApiMutation` | Mutation | Delete a api |
| `useSitesQuery` | Query | List all sites |
| `useSiteQuery` | Query | Get one site |
| `useCreateSiteMutation` | Mutation | Create a site |
| `useUpdateSiteMutation` | Mutation | Update a site |
| `useDeleteSiteMutation` | Mutation | Delete a site |
| `useAppsQuery` | Query | List all apps |
| `useAppQuery` | Query | Get one app |
| `useCreateAppMutation` | Mutation | Create a app |
| `useUpdateAppMutation` | Mutation | Update a app |
| `useDeleteAppMutation` | Mutation | Delete a app |
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
| `useRlsModulesQuery` | Query | List all rlsModules |
| `useRlsModuleQuery` | Query | Get one rlsModule |
| `useCreateRlsModuleMutation` | Mutation | Create a rlsModule |
| `useUpdateRlsModuleMutation` | Mutation | Update a rlsModule |
| `useDeleteRlsModuleMutation` | Mutation | Delete a rlsModule |
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
| `useDatabaseProvisionModulesQuery` | Query | List all databaseProvisionModules |
| `useDatabaseProvisionModuleQuery` | Query | Get one databaseProvisionModule |
| `useCreateDatabaseProvisionModuleMutation` | Mutation | Create a databaseProvisionModule |
| `useUpdateDatabaseProvisionModuleMutation` | Mutation | Update a databaseProvisionModule |
| `useDeleteDatabaseProvisionModuleMutation` | Mutation | Delete a databaseProvisionModule |
| `useAppAdminGrantsQuery` | Query | List all appAdminGrants |
| `useAppAdminGrantQuery` | Query | Get one appAdminGrant |
| `useCreateAppAdminGrantMutation` | Mutation | Create a appAdminGrant |
| `useUpdateAppAdminGrantMutation` | Mutation | Update a appAdminGrant |
| `useDeleteAppAdminGrantMutation` | Mutation | Delete a appAdminGrant |
| `useAppOwnerGrantsQuery` | Query | List all appOwnerGrants |
| `useAppOwnerGrantQuery` | Query | Get one appOwnerGrant |
| `useCreateAppOwnerGrantMutation` | Mutation | Create a appOwnerGrant |
| `useUpdateAppOwnerGrantMutation` | Mutation | Update a appOwnerGrant |
| `useDeleteAppOwnerGrantMutation` | Mutation | Delete a appOwnerGrant |
| `useAppGrantsQuery` | Query | List all appGrants |
| `useAppGrantQuery` | Query | Get one appGrant |
| `useCreateAppGrantMutation` | Mutation | Create a appGrant |
| `useUpdateAppGrantMutation` | Mutation | Update a appGrant |
| `useDeleteAppGrantMutation` | Mutation | Delete a appGrant |
| `useOrgMembershipsQuery` | Query | List all orgMemberships |
| `useOrgMembershipQuery` | Query | Get one orgMembership |
| `useCreateOrgMembershipMutation` | Mutation | Create a orgMembership |
| `useUpdateOrgMembershipMutation` | Mutation | Update a orgMembership |
| `useDeleteOrgMembershipMutation` | Mutation | Delete a orgMembership |
| `useOrgMembersQuery` | Query | List all orgMembers |
| `useOrgMemberQuery` | Query | Get one orgMember |
| `useCreateOrgMemberMutation` | Mutation | Create a orgMember |
| `useUpdateOrgMemberMutation` | Mutation | Update a orgMember |
| `useDeleteOrgMemberMutation` | Mutation | Delete a orgMember |
| `useOrgAdminGrantsQuery` | Query | List all orgAdminGrants |
| `useOrgAdminGrantQuery` | Query | Get one orgAdminGrant |
| `useCreateOrgAdminGrantMutation` | Mutation | Create a orgAdminGrant |
| `useUpdateOrgAdminGrantMutation` | Mutation | Update a orgAdminGrant |
| `useDeleteOrgAdminGrantMutation` | Mutation | Delete a orgAdminGrant |
| `useOrgOwnerGrantsQuery` | Query | List all orgOwnerGrants |
| `useOrgOwnerGrantQuery` | Query | Get one orgOwnerGrant |
| `useCreateOrgOwnerGrantMutation` | Mutation | Create a orgOwnerGrant |
| `useUpdateOrgOwnerGrantMutation` | Mutation | Update a orgOwnerGrant |
| `useDeleteOrgOwnerGrantMutation` | Mutation | Delete a orgOwnerGrant |
| `useOrgGrantsQuery` | Query | List all orgGrants |
| `useOrgGrantQuery` | Query | Get one orgGrant |
| `useCreateOrgGrantMutation` | Mutation | Create a orgGrant |
| `useUpdateOrgGrantMutation` | Mutation | Update a orgGrant |
| `useDeleteOrgGrantMutation` | Mutation | Delete a orgGrant |
| `useAppLimitsQuery` | Query | List all appLimits |
| `useAppLimitQuery` | Query | Get one appLimit |
| `useCreateAppLimitMutation` | Mutation | Create a appLimit |
| `useUpdateAppLimitMutation` | Mutation | Update a appLimit |
| `useDeleteAppLimitMutation` | Mutation | Delete a appLimit |
| `useOrgLimitsQuery` | Query | List all orgLimits |
| `useOrgLimitQuery` | Query | Get one orgLimit |
| `useCreateOrgLimitMutation` | Mutation | Create a orgLimit |
| `useUpdateOrgLimitMutation` | Mutation | Update a orgLimit |
| `useDeleteOrgLimitMutation` | Mutation | Delete a orgLimit |
| `useAppStepsQuery` | Query | List all appSteps |
| `useAppStepQuery` | Query | Get one appStep |
| `useCreateAppStepMutation` | Mutation | Create a appStep |
| `useUpdateAppStepMutation` | Mutation | Update a appStep |
| `useDeleteAppStepMutation` | Mutation | Delete a appStep |
| `useAppAchievementsQuery` | Query | List all appAchievements |
| `useAppAchievementQuery` | Query | Get one appAchievement |
| `useCreateAppAchievementMutation` | Mutation | Create a appAchievement |
| `useUpdateAppAchievementMutation` | Mutation | Update a appAchievement |
| `useDeleteAppAchievementMutation` | Mutation | Delete a appAchievement |
| `useInvitesQuery` | Query | List all invites |
| `useInviteQuery` | Query | Get one invite |
| `useCreateInviteMutation` | Mutation | Create a invite |
| `useUpdateInviteMutation` | Mutation | Update a invite |
| `useDeleteInviteMutation` | Mutation | Delete a invite |
| `useClaimedInvitesQuery` | Query | List all claimedInvites |
| `useClaimedInviteQuery` | Query | Get one claimedInvite |
| `useCreateClaimedInviteMutation` | Mutation | Create a claimedInvite |
| `useUpdateClaimedInviteMutation` | Mutation | Update a claimedInvite |
| `useDeleteClaimedInviteMutation` | Mutation | Delete a claimedInvite |
| `useOrgInvitesQuery` | Query | List all orgInvites |
| `useOrgInviteQuery` | Query | Get one orgInvite |
| `useCreateOrgInviteMutation` | Mutation | Create a orgInvite |
| `useUpdateOrgInviteMutation` | Mutation | Update a orgInvite |
| `useDeleteOrgInviteMutation` | Mutation | Delete a orgInvite |
| `useOrgClaimedInvitesQuery` | Query | List all orgClaimedInvites |
| `useOrgClaimedInviteQuery` | Query | Get one orgClaimedInvite |
| `useCreateOrgClaimedInviteMutation` | Mutation | Create a orgClaimedInvite |
| `useUpdateOrgClaimedInviteMutation` | Mutation | Update a orgClaimedInvite |
| `useDeleteOrgClaimedInviteMutation` | Mutation | Delete a orgClaimedInvite |
| `useAppPermissionDefaultsQuery` | Query | List all appPermissionDefaults |
| `useAppPermissionDefaultQuery` | Query | Get one appPermissionDefault |
| `useCreateAppPermissionDefaultMutation` | Mutation | Create a appPermissionDefault |
| `useUpdateAppPermissionDefaultMutation` | Mutation | Update a appPermissionDefault |
| `useDeleteAppPermissionDefaultMutation` | Mutation | Delete a appPermissionDefault |
| `useRefsQuery` | Query | List all refs |
| `useRefQuery` | Query | Get one ref |
| `useCreateRefMutation` | Mutation | Create a ref |
| `useUpdateRefMutation` | Mutation | Update a ref |
| `useDeleteRefMutation` | Mutation | Delete a ref |
| `useStoresQuery` | Query | List all stores |
| `useStoreQuery` | Query | Get one store |
| `useCreateStoreMutation` | Mutation | Create a store |
| `useUpdateStoreMutation` | Mutation | Update a store |
| `useDeleteStoreMutation` | Mutation | Delete a store |
| `useRoleTypesQuery` | Query | List all roleTypes |
| `useRoleTypeQuery` | Query | Get one roleType |
| `useCreateRoleTypeMutation` | Mutation | Create a roleType |
| `useUpdateRoleTypeMutation` | Mutation | Update a roleType |
| `useDeleteRoleTypeMutation` | Mutation | Delete a roleType |
| `useOrgPermissionDefaultsQuery` | Query | List all orgPermissionDefaults |
| `useOrgPermissionDefaultQuery` | Query | Get one orgPermissionDefault |
| `useCreateOrgPermissionDefaultMutation` | Mutation | Create a orgPermissionDefault |
| `useUpdateOrgPermissionDefaultMutation` | Mutation | Update a orgPermissionDefault |
| `useDeleteOrgPermissionDefaultMutation` | Mutation | Delete a orgPermissionDefault |
| `useAppLimitDefaultsQuery` | Query | List all appLimitDefaults |
| `useAppLimitDefaultQuery` | Query | Get one appLimitDefault |
| `useCreateAppLimitDefaultMutation` | Mutation | Create a appLimitDefault |
| `useUpdateAppLimitDefaultMutation` | Mutation | Update a appLimitDefault |
| `useDeleteAppLimitDefaultMutation` | Mutation | Delete a appLimitDefault |
| `useOrgLimitDefaultsQuery` | Query | List all orgLimitDefaults |
| `useOrgLimitDefaultQuery` | Query | Get one orgLimitDefault |
| `useCreateOrgLimitDefaultMutation` | Mutation | Create a orgLimitDefault |
| `useUpdateOrgLimitDefaultMutation` | Mutation | Update a orgLimitDefault |
| `useDeleteOrgLimitDefaultMutation` | Mutation | Delete a orgLimitDefault |
| `useCryptoAddressesQuery` | Query | List all cryptoAddresses |
| `useCryptoAddressQuery` | Query | Get one cryptoAddress |
| `useCreateCryptoAddressMutation` | Mutation | Create a cryptoAddress |
| `useUpdateCryptoAddressMutation` | Mutation | Update a cryptoAddress |
| `useDeleteCryptoAddressMutation` | Mutation | Delete a cryptoAddress |
| `useMembershipTypesQuery` | Query | List all membershipTypes |
| `useMembershipTypeQuery` | Query | Get one membershipType |
| `useCreateMembershipTypeMutation` | Mutation | Create a membershipType |
| `useUpdateMembershipTypeMutation` | Mutation | Update a membershipType |
| `useDeleteMembershipTypeMutation` | Mutation | Delete a membershipType |
| `useConnectedAccountsQuery` | Query | List all connectedAccounts |
| `useConnectedAccountQuery` | Query | Get one connectedAccount |
| `useCreateConnectedAccountMutation` | Mutation | Create a connectedAccount |
| `useUpdateConnectedAccountMutation` | Mutation | Update a connectedAccount |
| `useDeleteConnectedAccountMutation` | Mutation | Delete a connectedAccount |
| `usePhoneNumbersQuery` | Query | List all phoneNumbers |
| `usePhoneNumberQuery` | Query | Get one phoneNumber |
| `useCreatePhoneNumberMutation` | Mutation | Create a phoneNumber |
| `useUpdatePhoneNumberMutation` | Mutation | Update a phoneNumber |
| `useDeletePhoneNumberMutation` | Mutation | Delete a phoneNumber |
| `useAppMembershipDefaultsQuery` | Query | List all appMembershipDefaults |
| `useAppMembershipDefaultQuery` | Query | Get one appMembershipDefault |
| `useCreateAppMembershipDefaultMutation` | Mutation | Create a appMembershipDefault |
| `useUpdateAppMembershipDefaultMutation` | Mutation | Update a appMembershipDefault |
| `useDeleteAppMembershipDefaultMutation` | Mutation | Delete a appMembershipDefault |
| `useNodeTypeRegistriesQuery` | Query | List all nodeTypeRegistries |
| `useNodeTypeRegistryQuery` | Query | Get one nodeTypeRegistry |
| `useCreateNodeTypeRegistryMutation` | Mutation | Create a nodeTypeRegistry |
| `useUpdateNodeTypeRegistryMutation` | Mutation | Update a nodeTypeRegistry |
| `useDeleteNodeTypeRegistryMutation` | Mutation | Delete a nodeTypeRegistry |
| `useCommitsQuery` | Query | List all commits |
| `useCommitQuery` | Query | Get one commit |
| `useCreateCommitMutation` | Mutation | Create a commit |
| `useUpdateCommitMutation` | Mutation | Update a commit |
| `useDeleteCommitMutation` | Mutation | Delete a commit |
| `useOrgMembershipDefaultsQuery` | Query | List all orgMembershipDefaults |
| `useOrgMembershipDefaultQuery` | Query | Get one orgMembershipDefault |
| `useCreateOrgMembershipDefaultMutation` | Mutation | Create a orgMembershipDefault |
| `useUpdateOrgMembershipDefaultMutation` | Mutation | Update a orgMembershipDefault |
| `useDeleteOrgMembershipDefaultMutation` | Mutation | Delete a orgMembershipDefault |
| `useEmailsQuery` | Query | List all emails |
| `useEmailQuery` | Query | Get one email |
| `useCreateEmailMutation` | Mutation | Create a email |
| `useUpdateEmailMutation` | Mutation | Update a email |
| `useDeleteEmailMutation` | Mutation | Delete a email |
| `useAuditLogsQuery` | Query | List all auditLogs |
| `useAuditLogQuery` | Query | Get one auditLog |
| `useCreateAuditLogMutation` | Mutation | Create a auditLog |
| `useUpdateAuditLogMutation` | Mutation | Update a auditLog |
| `useDeleteAuditLogMutation` | Mutation | Delete a auditLog |
| `useAppLevelsQuery` | Query | List all appLevels |
| `useAppLevelQuery` | Query | Get one appLevel |
| `useCreateAppLevelMutation` | Mutation | Create a appLevel |
| `useUpdateAppLevelMutation` | Mutation | Update a appLevel |
| `useDeleteAppLevelMutation` | Mutation | Delete a appLevel |
| `useSqlMigrationsQuery` | Query | List all sqlMigrations |
| `useSqlMigrationQuery` | Query | Get one sqlMigration |
| `useCreateSqlMigrationMutation` | Mutation | Create a sqlMigration |
| `useUpdateSqlMigrationMutation` | Mutation | Update a sqlMigration |
| `useDeleteSqlMigrationMutation` | Mutation | Delete a sqlMigration |
| `useAstMigrationsQuery` | Query | List all astMigrations |
| `useAstMigrationQuery` | Query | Get one astMigration |
| `useCreateAstMigrationMutation` | Mutation | Create a astMigration |
| `useUpdateAstMigrationMutation` | Mutation | Update a astMigration |
| `useDeleteAstMigrationMutation` | Mutation | Delete a astMigration |
| `useAppMembershipsQuery` | Query | List all appMemberships |
| `useAppMembershipQuery` | Query | Get one appMembership |
| `useCreateAppMembershipMutation` | Mutation | Create a appMembership |
| `useUpdateAppMembershipMutation` | Mutation | Update a appMembership |
| `useDeleteAppMembershipMutation` | Mutation | Delete a appMembership |
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
| `useRemoveNodeAtPathMutation` | Mutation | removeNodeAtPath |
| `useBootstrapUserMutation` | Mutation | bootstrapUser |
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
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one appPermission
const { data: item } = useAppPermissionQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a appPermission
const { mutate: create } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' });
```

### OrgPermission

```typescript
// List all orgPermissions
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one orgPermission
const { data: item } = useOrgPermissionQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a orgPermission
const { mutate: create } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' });
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
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Get one appLevelRequirement
const { data: item } = useAppLevelRequirementQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Create a appLevelRequirement
const { mutate: create } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', level: '<value>', description: '<value>', requiredCount: '<value>', priority: '<value>' });
```

### Database

```typescript
// List all databases
const { data, isLoading } = useDatabasesQuery({
  selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } },
});

// Get one database
const { data: item } = useDatabaseQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } },
});

// Create a database
const { mutate: create } = useCreateDatabaseMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', schemaHash: '<value>', name: '<value>', label: '<value>', hash: '<value>' });
```

### Schema

```typescript
// List all schemas
const { data, isLoading } = useSchemasQuery({
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } },
});

// Get one schema
const { data: item } = useSchemaQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } },
});

// Create a schema
const { mutate: create } = useCreateSchemaMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', schemaName: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', isPublic: '<value>' });
```

### Table

```typescript
// List all tables
const { data, isLoading } = useTablesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } },
});

// Get one table
const { data: item } = useTableQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } },
});

// Create a table
const { mutate: create } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', useRls: '<value>', timestamps: '<value>', peoplestamps: '<value>', pluralName: '<value>', singularName: '<value>', tags: '<value>', inheritsId: '<value>' });
```

### CheckConstraint

```typescript
// List all checkConstraints
const { data, isLoading } = useCheckConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one checkConstraint
const { data: item } = useCheckConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, expr: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a checkConstraint
const { mutate: create } = useCreateCheckConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', expr: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```

### Field

```typescript
// List all fields
const { data, isLoading } = useFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});

// Get one field
const { data: item } = useFieldQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});

// Create a field
const { mutate: create } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', isRequired: '<value>', defaultValue: '<value>', defaultValueAst: '<value>', isHidden: '<value>', type: '<value>', fieldOrder: '<value>', regexp: '<value>', chk: '<value>', chkExpr: '<value>', min: '<value>', max: '<value>', tags: '<value>', category: '<value>', module: '<value>', scope: '<value>' });
```

### ForeignKeyConstraint

```typescript
// List all foreignKeyConstraints
const { data, isLoading } = useForeignKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one foreignKeyConstraint
const { data: item } = useForeignKeyConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, refTableId: true, refFieldIds: true, deleteAction: true, updateAction: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a foreignKeyConstraint
const { mutate: create } = useCreateForeignKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', refTableId: '<value>', refFieldIds: '<value>', deleteAction: '<value>', updateAction: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
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
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one index
const { data: item } = useIndexQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a index
const { mutate: create } = useCreateIndexMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', fieldIds: '<value>', includeFieldIds: '<value>', accessMethod: '<value>', indexParams: '<value>', whereClause: '<value>', isUnique: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```

### LimitFunction

```typescript
// List all limitFunctions
const { data, isLoading } = useLimitFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, data: true, security: true } },
});

// Get one limitFunction
const { data: item } = useLimitFunctionQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, data: true, security: true } },
});

// Create a limitFunction
const { mutate: create } = useCreateLimitFunctionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', data: '<value>', security: '<value>' });
```

### Policy

```typescript
// List all policies
const { data, isLoading } = usePoliciesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, roleName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one policy
const { data: item } = usePolicyQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, roleName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a policy
const { mutate: create } = useCreatePolicyMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', roleName: '<value>', privilege: '<value>', permissive: '<value>', disabled: '<value>', policyType: '<value>', data: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```

### PrimaryKeyConstraint

```typescript
// List all primaryKeyConstraints
const { data, isLoading } = usePrimaryKeyConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one primaryKeyConstraint
const { data: item } = usePrimaryKeyConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, type: true, fieldIds: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a primaryKeyConstraint
const { mutate: create } = useCreatePrimaryKeyConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```

### TableGrant

```typescript
// List all tableGrants
const { data, isLoading } = useTableGrantsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, roleName: true, fieldIds: true, createdAt: true, updatedAt: true } },
});

// Get one tableGrant
const { data: item } = useTableGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, roleName: true, fieldIds: true, createdAt: true, updatedAt: true } },
});

// Create a tableGrant
const { mutate: create } = useCreateTableGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', privilege: '<value>', roleName: '<value>', fieldIds: '<value>' });
```

### Trigger

```typescript
// List all triggers
const { data, isLoading } = useTriggersQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one trigger
const { data: item } = useTriggerQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, event: true, functionName: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a trigger
const { mutate: create } = useCreateTriggerMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', event: '<value>', functionName: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```

### UniqueConstraint

```typescript
// List all uniqueConstraints
const { data, isLoading } = useUniqueConstraintsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one uniqueConstraint
const { data: item } = useUniqueConstraintQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, description: true, smartTags: true, type: true, fieldIds: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a uniqueConstraint
const { mutate: create } = useCreateUniqueConstraintMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```

### View

```typescript
// List all views
const { data, isLoading } = useViewsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});

// Get one view
const { data: item } = useViewQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});

// Create a view
const { mutate: create } = useCreateViewMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', name: '<value>', tableId: '<value>', viewType: '<value>', data: '<value>', filterType: '<value>', filterData: '<value>', securityInvoker: '<value>', isReadOnly: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
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
  selection: { fields: { id: true, databaseId: true, viewId: true, roleName: true, privilege: true, withGrantOption: true } },
});

// Get one viewGrant
const { data: item } = useViewGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, viewId: true, roleName: true, privilege: true, withGrantOption: true } },
});

// Create a viewGrant
const { mutate: create } = useCreateViewGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', viewId: '<value>', roleName: '<value>', privilege: '<value>', withGrantOption: '<value>' });
```

### ViewRule

```typescript
// List all viewRules
const { data, isLoading } = useViewRulesQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } },
});

// Get one viewRule
const { data: item } = useViewRuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } },
});

// Create a viewRule
const { mutate: create } = useCreateViewRuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', viewId: '<value>', name: '<value>', event: '<value>', action: '<value>' });
```

### TableModule

```typescript
// List all tableModules
const { data, isLoading } = useTableModulesQuery({
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, nodeType: true, data: true, fields: true } },
});

// Get one tableModule
const { data: item } = useTableModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, nodeType: true, data: true, fields: true } },
});

// Create a tableModule
const { mutate: create } = useCreateTableModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', nodeType: '<value>', data: '<value>', fields: '<value>' });
```

### TableTemplateModule

```typescript
// List all tableTemplateModules
const { data, isLoading } = useTableTemplateModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } },
});

// Get one tableTemplateModule
const { data: item } = useTableTemplateModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, nodeType: true, data: true } },
});

// Create a tableTemplateModule
const { mutate: create } = useCreateTableTemplateModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', nodeType: '<value>', data: '<value>' });
```

### SchemaGrant

```typescript
// List all schemaGrants
const { data, isLoading } = useSchemaGrantsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } },
});

// Get one schemaGrant
const { data: item } = useSchemaGrantQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } },
});

// Create a schemaGrant
const { mutate: create } = useCreateSchemaGrantMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', granteeName: '<value>' });
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
  selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } },
});

// Get one apiModule
const { data: item } = useApiModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } },
});

// Create a apiModule
const { mutate: create } = useCreateApiModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', apiId: '<value>', name: '<value>', data: '<value>' });
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
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } },
});

// Get one siteMetadatum
const { data: item } = useSiteMetadatumQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, siteId: true, title: true, description: true, ogImage: true } },
});

// Create a siteMetadatum
const { mutate: create } = useCreateSiteMetadatumMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', siteId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>' });
```

### SiteModule

```typescript
// List all siteModules
const { data, isLoading } = useSiteModulesQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true } },
});

// Get one siteModule
const { data: item } = useSiteModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true } },
});

// Create a siteModule
const { mutate: create } = useCreateSiteModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', siteId: '<value>', name: '<value>', data: '<value>' });
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

### Procedure

```typescript
// List all procedures
const { data, isLoading } = useProceduresQuery({
  selection: { fields: { id: true, databaseId: true, name: true, argnames: true, argtypes: true, argdefaults: true, langName: true, definition: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one procedure
const { data: item } = useProcedureQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, argnames: true, argtypes: true, argdefaults: true, langName: true, definition: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a procedure
const { mutate: create } = useCreateProcedureMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', argnames: '<value>', argtypes: '<value>', argdefaults: '<value>', langName: '<value>', definition: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```

### TriggerFunction

```typescript
// List all triggerFunctions
const { data, isLoading } = useTriggerFunctionsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true } },
});

// Get one triggerFunction
const { data: item } = useTriggerFunctionQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, code: true, createdAt: true, updatedAt: true } },
});

// Create a triggerFunction
const { mutate: create } = useCreateTriggerFunctionMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', code: '<value>' });
```

### Api

```typescript
// List all apis
const { data, isLoading } = useApisQuery({
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } },
});

// Get one api
const { data: item } = useApiQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, dbname: true, roleName: true, anonRole: true, isPublic: true } },
});

// Create a api
const { mutate: create } = useCreateApiMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', dbname: '<value>', roleName: '<value>', anonRole: '<value>', isPublic: '<value>' });
```

### Site

```typescript
// List all sites
const { data, isLoading } = useSitesQuery({
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } },
});

// Get one site
const { data: item } = useSiteQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, title: true, description: true, ogImage: true, favicon: true, appleTouchIcon: true, logo: true, dbname: true } },
});

// Create a site
const { mutate: create } = useCreateSiteMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>', favicon: '<value>', appleTouchIcon: '<value>', logo: '<value>', dbname: '<value>' });
```

### App

```typescript
// List all apps
const { data, isLoading } = useAppsQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } },
});

// Get one app
const { data: item } = useAppQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, appImage: true, appStoreLink: true, appStoreId: true, appIdPrefix: true, playStoreLink: true } },
});

// Create a app
const { mutate: create } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', siteId: '<value>', name: '<value>', appImage: '<value>', appStoreLink: '<value>', appStoreId: '<value>', appIdPrefix: '<value>', playStoreLink: '<value>' });
```

### ConnectedAccountsModule

```typescript
// List all connectedAccountsModules
const { data, isLoading } = useConnectedAccountsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Get one connectedAccountsModule
const { data: item } = useConnectedAccountsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Create a connectedAccountsModule
const { mutate: create } = useCreateConnectedAccountsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' });
```

### CryptoAddressesModule

```typescript
// List all cryptoAddressesModules
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } },
});

// Get one cryptoAddressesModule
const { data: item } = useCryptoAddressesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } },
});

// Create a cryptoAddressesModule
const { mutate: create } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', cryptoNetwork: '<value>' });
```

### CryptoAuthModule

```typescript
// List all cryptoAuthModules
const { data, isLoading } = useCryptoAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } },
});

// Get one cryptoAuthModule
const { data: item } = useCryptoAuthModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, usersTableId: true, secretsTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, addressesTableId: true, userField: true, cryptoNetwork: true, signInRequestChallenge: true, signInRecordFailure: true, signUpWithKey: true, signInWithChallenge: true } },
});

// Create a cryptoAuthModule
const { mutate: create } = useCreateCryptoAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', addressesTableId: '<value>', userField: '<value>', cryptoNetwork: '<value>', signInRequestChallenge: '<value>', signInRecordFailure: '<value>', signUpWithKey: '<value>', signInWithChallenge: '<value>' });
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
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } },
});

// Get one denormalizedTableField
const { data: item } = useDenormalizedTableFieldQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, tableId: true, fieldId: true, setIds: true, refTableId: true, refFieldId: true, refIds: true, useUpdates: true, updateDefaults: true, funcName: true, funcOrder: true } },
});

// Create a denormalizedTableField
const { mutate: create } = useCreateDenormalizedTableFieldMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', tableId: '<value>', fieldId: '<value>', setIds: '<value>', refTableId: '<value>', refFieldId: '<value>', refIds: '<value>', useUpdates: '<value>', updateDefaults: '<value>', funcName: '<value>', funcOrder: '<value>' });
```

### EmailsModule

```typescript
// List all emailsModules
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Get one emailsModule
const { data: item } = useEmailsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Create a emailsModule
const { mutate: create } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' });
```

### EncryptedSecretsModule

```typescript
// List all encryptedSecretsModules
const { data, isLoading } = useEncryptedSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one encryptedSecretsModule
const { data: item } = useEncryptedSecretsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a encryptedSecretsModule
const { mutate: create } = useCreateEncryptedSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' });
```

### FieldModule

```typescript
// List all fieldModules
const { data, isLoading } = useFieldModulesQuery({
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } },
});

// Get one fieldModule
const { data: item } = useFieldModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, privateSchemaId: true, tableId: true, fieldId: true, nodeType: true, data: true, triggers: true, functions: true } },
});

// Create a fieldModule
const { mutate: create } = useCreateFieldModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', fieldId: '<value>', nodeType: '<value>', data: '<value>', triggers: '<value>', functions: '<value>' });
```

### InvitesModule

```typescript
// List all invitesModules
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } },
});

// Get one invitesModule
const { data: item } = useInvitesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } },
});

// Create a invitesModule
const { mutate: create } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', invitesTableId: '<value>', claimedInvitesTableId: '<value>', invitesTableName: '<value>', claimedInvitesTableName: '<value>', submitInviteCodeFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>' });
```

### LevelsModule

```typescript
// List all levelsModules
const { data, isLoading } = useLevelsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Get one levelsModule
const { data: item } = useLevelsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Create a levelsModule
const { mutate: create } = useCreateLevelsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', stepsTableId: '<value>', stepsTableName: '<value>', achievementsTableId: '<value>', achievementsTableName: '<value>', levelsTableId: '<value>', levelsTableName: '<value>', levelRequirementsTableId: '<value>', levelRequirementsTableName: '<value>', completedStep: '<value>', incompletedStep: '<value>', tgAchievement: '<value>', tgAchievementToggle: '<value>', tgAchievementToggleBoolean: '<value>', tgAchievementBoolean: '<value>', upsertAchievement: '<value>', tgUpdateAchievements: '<value>', stepsRequired: '<value>', levelAchieved: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' });
```

### LimitsModule

```typescript
// List all limitsModules
const { data, isLoading } = useLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Get one limitsModule
const { data: item } = useLimitsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, limitIncrementFunction: true, limitDecrementFunction: true, limitIncrementTrigger: true, limitDecrementTrigger: true, limitUpdateTrigger: true, limitCheckFunction: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});

// Create a limitsModule
const { mutate: create } = useCreateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', limitIncrementFunction: '<value>', limitDecrementFunction: '<value>', limitIncrementTrigger: '<value>', limitDecrementTrigger: '<value>', limitUpdateTrigger: '<value>', limitCheckFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' });
```

### MembershipTypesModule

```typescript
// List all membershipTypesModules
const { data, isLoading } = useMembershipTypesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one membershipTypesModule
const { data: item } = useMembershipTypesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a membershipTypesModule
const { mutate: create } = useCreateMembershipTypesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' });
```

### MembershipsModule

```typescript
// List all membershipsModules
const { data, isLoading } = useMembershipsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true } },
});

// Get one membershipsModule
const { data: item } = useMembershipsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, membershipsTableId: true, membershipsTableName: true, membersTableId: true, membersTableName: true, membershipDefaultsTableId: true, membershipDefaultsTableName: true, grantsTableId: true, grantsTableName: true, actorTableId: true, limitsTableId: true, defaultLimitsTableId: true, permissionsTableId: true, defaultPermissionsTableId: true, sprtTableId: true, adminGrantsTableId: true, adminGrantsTableName: true, ownerGrantsTableId: true, ownerGrantsTableName: true, membershipType: true, entityTableId: true, entityTableOwnerId: true, prefix: true, actorMaskCheck: true, actorPermCheck: true, entityIdsByMask: true, entityIdsByPerm: true, entityIdsFunction: true } },
});

// Create a membershipsModule
const { mutate: create } = useCreateMembershipsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', membershipsTableId: '<value>', membershipsTableName: '<value>', membersTableId: '<value>', membersTableName: '<value>', membershipDefaultsTableId: '<value>', membershipDefaultsTableName: '<value>', grantsTableId: '<value>', grantsTableName: '<value>', actorTableId: '<value>', limitsTableId: '<value>', defaultLimitsTableId: '<value>', permissionsTableId: '<value>', defaultPermissionsTableId: '<value>', sprtTableId: '<value>', adminGrantsTableId: '<value>', adminGrantsTableName: '<value>', ownerGrantsTableId: '<value>', ownerGrantsTableName: '<value>', membershipType: '<value>', entityTableId: '<value>', entityTableOwnerId: '<value>', prefix: '<value>', actorMaskCheck: '<value>', actorPermCheck: '<value>', entityIdsByMask: '<value>', entityIdsByPerm: '<value>', entityIdsFunction: '<value>' });
```

### PermissionsModule

```typescript
// List all permissionsModules
const { data, isLoading } = usePermissionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } },
});

// Get one permissionsModule
const { data: item } = usePermissionsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, defaultTableId: true, defaultTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, prefix: true, getPaddedMask: true, getMask: true, getByMask: true, getMaskByName: true } },
});

// Create a permissionsModule
const { mutate: create } = useCreatePermissionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', bitlen: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', prefix: '<value>', getPaddedMask: '<value>', getMask: '<value>', getByMask: '<value>', getMaskByName: '<value>' });
```

### PhoneNumbersModule

```typescript
// List all phoneNumbersModules
const { data, isLoading } = usePhoneNumbersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Get one phoneNumbersModule
const { data: item } = usePhoneNumbersModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});

// Create a phoneNumbersModule
const { mutate: create } = useCreatePhoneNumbersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' });
```

### ProfilesModule

```typescript
// List all profilesModules
const { data, isLoading } = useProfilesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } },
});

// Get one profilesModule
const { data: item } = useProfilesModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true, profilePermissionsTableId: true, profilePermissionsTableName: true, profileGrantsTableId: true, profileGrantsTableName: true, profileDefinitionGrantsTableId: true, profileDefinitionGrantsTableName: true, bitlen: true, membershipType: true, entityTableId: true, actorTableId: true, permissionsTableId: true, membershipsTableId: true, prefix: true } },
});

// Create a profilesModule
const { mutate: create } = useCreateProfilesModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', profilePermissionsTableId: '<value>', profilePermissionsTableName: '<value>', profileGrantsTableId: '<value>', profileGrantsTableName: '<value>', profileDefinitionGrantsTableId: '<value>', profileDefinitionGrantsTableName: '<value>', bitlen: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', permissionsTableId: '<value>', membershipsTableId: '<value>', prefix: '<value>' });
```

### RlsModule

```typescript
// List all rlsModules
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } },
});

// Get one rlsModule
const { data: item } = useRlsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, apiId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } },
});

// Create a rlsModule
const { mutate: create } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', apiId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', sessionCredentialsTableId: '<value>', sessionsTableId: '<value>', usersTableId: '<value>', authenticate: '<value>', authenticateStrict: '<value>', currentRole: '<value>', currentRoleId: '<value>' });
```

### SecretsModule

```typescript
// List all secretsModules
const { data, isLoading } = useSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Get one secretsModule
const { data: item } = useSecretsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});

// Create a secretsModule
const { mutate: create } = useCreateSecretsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' });
```

### SessionsModule

```typescript
// List all sessionsModules
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } },
});

// Get one sessionsModule
const { data: item } = useSessionsModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } },
});

// Create a sessionsModule
const { mutate: create } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', authSettingsTableId: '<value>', usersTableId: '<value>', sessionsDefaultExpiration: '<value>', sessionsTable: '<value>', sessionCredentialsTable: '<value>', authSettingsTable: '<value>' });
```

### UserAuthModule

```typescript
// List all userAuthModules
const { data, isLoading } = useUserAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true } },
});

// Get one userAuthModule
const { data: item } = useUserAuthModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, emailsTableId: true, usersTableId: true, secretsTableId: true, encryptedTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, auditsTableName: true, signInFunction: true, signUpFunction: true, signOutFunction: true, setPasswordFunction: true, resetPasswordFunction: true, forgotPasswordFunction: true, sendVerificationEmailFunction: true, verifyEmailFunction: true, verifyPasswordFunction: true, checkPasswordFunction: true, sendAccountDeletionEmailFunction: true, deleteAccountFunction: true, signInOneTimeTokenFunction: true, oneTimeTokenFunction: true, extendTokenExpires: true } },
});

// Create a userAuthModule
const { mutate: create } = useCreateUserAuthModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', secretsTableId: '<value>', encryptedTableId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', auditsTableId: '<value>', auditsTableName: '<value>', signInFunction: '<value>', signUpFunction: '<value>', signOutFunction: '<value>', setPasswordFunction: '<value>', resetPasswordFunction: '<value>', forgotPasswordFunction: '<value>', sendVerificationEmailFunction: '<value>', verifyEmailFunction: '<value>', verifyPasswordFunction: '<value>', checkPasswordFunction: '<value>', sendAccountDeletionEmailFunction: '<value>', deleteAccountFunction: '<value>', signInOneTimeTokenFunction: '<value>', oneTimeTokenFunction: '<value>', extendTokenExpires: '<value>' });
```

### UsersModule

```typescript
// List all usersModules
const { data, isLoading } = useUsersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } },
});

// Get one usersModule
const { data: item } = useUsersModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, typeTableId: true, typeTableName: true } },
});

// Create a usersModule
const { mutate: create } = useCreateUsersModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', typeTableId: '<value>', typeTableName: '<value>' });
```

### UuidModule

```typescript
// List all uuidModules
const { data, isLoading } = useUuidModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true } },
});

// Get one uuidModule
const { data: item } = useUuidModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true } },
});

// Create a uuidModule
const { mutate: create } = useCreateUuidModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', uuidFunction: '<value>', uuidSeed: '<value>' });
```

### DatabaseProvisionModule

```typescript
// List all databaseProvisionModules
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } },
});

// Get one databaseProvisionModule
const { data: item } = useDatabaseProvisionModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } },
});

// Create a databaseProvisionModule
const { mutate: create } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseName: '<value>', ownerId: '<value>', subdomain: '<value>', domain: '<value>', modules: '<value>', options: '<value>', bootstrapUser: '<value>', status: '<value>', errorMessage: '<value>', databaseId: '<value>', completedAt: '<value>' });
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
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } },
});

// Get one orgMembership
const { data: item } = useOrgMembershipQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true } },
});

// Create a orgMembership
const { mutate: create } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', entityId: '<value>' });
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
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Get one invite
const { data: item } = useInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Create a invite
const { mutate: create } = useCreateInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<value>', senderId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>' });
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
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgInvite
const { data: item } = useOrgInviteQuery({
  id: '<value>',
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgInvite
const { mutate: create } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<value>', senderId: '<value>', receiverId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', entityId: '<value>' });
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

### Ref

```typescript
// List all refs
const { data, isLoading } = useRefsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Get one ref
const { data: item } = useRefQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Create a ref
const { mutate: create } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', databaseId: '<value>', storeId: '<value>', commitId: '<value>' });
```

### Store

```typescript
// List all stores
const { data, isLoading } = useStoresQuery({
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Get one store
const { data: item } = useStoreQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Create a store
const { mutate: create } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', databaseId: '<value>', hash: '<value>' });
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

### CryptoAddress

```typescript
// List all cryptoAddresses
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Get one cryptoAddress
const { data: item } = useCryptoAddressQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Create a cryptoAddress
const { mutate: create } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', address: '<value>', isVerified: '<value>', isPrimary: '<value>' });
```

### MembershipType

```typescript
// List all membershipTypes
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true } },
});

// Get one membershipType
const { data: item } = useMembershipTypeQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, description: true, prefix: true } },
});

// Create a membershipType
const { mutate: create } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', description: '<value>', prefix: '<value>' });
```

### ConnectedAccount

```typescript
// List all connectedAccounts
const { data, isLoading } = useConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Get one connectedAccount
const { data: item } = useConnectedAccountQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Create a connectedAccount
const { mutate: create } = useCreateConnectedAccountMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', service: '<value>', identifier: '<value>', details: '<value>', isVerified: '<value>' });
```

### PhoneNumber

```typescript
// List all phoneNumbers
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Get one phoneNumber
const { data: item } = usePhoneNumberQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Create a phoneNumber
const { mutate: create } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', cc: '<value>', number: '<value>', isVerified: '<value>', isPrimary: '<value>' });
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

### NodeTypeRegistry

```typescript
// List all nodeTypeRegistries
const { data, isLoading } = useNodeTypeRegistriesQuery({
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true } },
});

// Get one nodeTypeRegistry
const { data: item } = useNodeTypeRegistryQuery({
  name: '<value>',
  selection: { fields: { name: true, slug: true, category: true, displayName: true, description: true, parameterSchema: true, tags: true, createdAt: true, updatedAt: true } },
});

// Create a nodeTypeRegistry
const { mutate: create } = useCreateNodeTypeRegistryMutation({
  selection: { fields: { name: true } },
});
create({ slug: '<value>', category: '<value>', displayName: '<value>', description: '<value>', parameterSchema: '<value>', tags: '<value>' });
```

### Commit

```typescript
// List all commits
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one commit
const { data: item } = useCommitQuery({
  id: '<value>',
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a commit
const { mutate: create } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<value>', databaseId: '<value>', storeId: '<value>', parentIds: '<value>', authorId: '<value>', committerId: '<value>', treeId: '<value>', date: '<value>' });
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

### AuditLog

```typescript
// List all auditLogs
const { data, isLoading } = useAuditLogsQuery({
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } },
});

// Get one auditLog
const { data: item } = useAuditLogQuery({
  id: '<value>',
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } },
});

// Create a auditLog
const { mutate: create } = useCreateAuditLogMutation({
  selection: { fields: { id: true } },
});
create({ event: '<value>', actorId: '<value>', origin: '<value>', userAgent: '<value>', ipAddress: '<value>', success: '<value>' });
```

### AppLevel

```typescript
// List all appLevels
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Get one appLevel
const { data: item } = useAppLevelQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Create a appLevel
const { mutate: create } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', description: '<value>', image: '<value>', ownerId: '<value>' });
```

### SqlMigration

```typescript
// List all sqlMigrations
const { data, isLoading } = useSqlMigrationsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Get one sqlMigration
const { data: item } = useSqlMigrationQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Create a sqlMigration
const { mutate: create } = useCreateSqlMigrationMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>', databaseId: '<value>', deploy: '<value>', deps: '<value>', payload: '<value>', content: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>' });
```

### AstMigration

```typescript
// List all astMigrations
const { data, isLoading } = useAstMigrationsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Get one astMigration
const { data: item } = useAstMigrationQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});

// Create a astMigration
const { mutate: create } = useCreateAstMigrationMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', name: '<value>', requires: '<value>', payload: '<value>', deploys: '<value>', deploy: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>' });
```

### AppMembership

```typescript
// List all appMemberships
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true } },
});

// Get one appMembership
const { data: item } = useAppMembershipQuery({
  id: '<value>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true } },
});

// Create a appMembership
const { mutate: create } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isVerified: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>' });
```

### User

```typescript
// List all users
const { data, isLoading } = useUsersQuery({
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true } },
});

// Get one user
const { data: item } = useUserQuery({
  id: '<value>',
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true } },
});

// Create a user
const { mutate: create } = useCreateUserMutation({
  selection: { fields: { id: true } },
});
create({ username: '<value>', displayName: '<value>', profilePicture: '<value>', searchTsv: '<value>', type: '<value>', searchTsvRank: '<value>' });
```

### HierarchyModule

```typescript
// List all hierarchyModules
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } },
});

// Get one hierarchyModule
const { data: item } = useHierarchyModuleQuery({
  id: '<value>',
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } },
});

// Create a hierarchyModule
const { mutate: create } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', chartEdgesTableId: '<value>', chartEdgesTableName: '<value>', hierarchySprtTableId: '<value>', hierarchySprtTableName: '<value>', chartEdgeGrantsTableId: '<value>', chartEdgeGrantsTableName: '<value>', entityTableId: '<value>', usersTableId: '<value>', prefix: '<value>', privateSchemaName: '<value>', sprtTableName: '<value>', rebuildHierarchyFunction: '<value>', getSubordinatesFunction: '<value>', getManagersFunction: '<value>', isManagerOfFunction: '<value>' });
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

### `useRemoveNodeAtPathMutation`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RemoveNodeAtPathInput (required) |

### `useBootstrapUserMutation`

bootstrapUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | BootstrapUserInput (required) |

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
