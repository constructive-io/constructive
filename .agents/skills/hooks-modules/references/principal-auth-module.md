# principalAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database.

## Usage

```typescript
usePrincipalAuthModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, principalsTableId: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, usersTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, principalsTableName: true, createPrincipalFunction: true, deletePrincipalFunction: true, createOrgPrincipalFunction: true, deleteOrgPrincipalFunction: true, createOrgApiKeyFunction: true, revokeOrgApiKeyFunction: true, apiName: true } } })
usePrincipalAuthModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, principalsTableId: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, usersTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, principalsTableName: true, createPrincipalFunction: true, deletePrincipalFunction: true, createOrgPrincipalFunction: true, deleteOrgPrincipalFunction: true, createOrgApiKeyFunction: true, revokeOrgApiKeyFunction: true, apiName: true } } })
useCreatePrincipalAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalAuthModuleMutation({ selection: { fields: { id: true } } })
useDeletePrincipalAuthModuleMutation({})
```

## Examples

### List all principalAuthModules

```typescript
const { data, isLoading } = usePrincipalAuthModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, principalsTableId: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, usersTableId: true, sessionsTableId: true, sessionCredentialsTableId: true, auditsTableId: true, principalsTableName: true, createPrincipalFunction: true, deletePrincipalFunction: true, createOrgPrincipalFunction: true, deleteOrgPrincipalFunction: true, createOrgApiKeyFunction: true, revokeOrgApiKeyFunction: true, apiName: true } },
});
```

### Create a principalAuthModule

```typescript
const { mutate } = useCreatePrincipalAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', principalsTableId: '<UUID>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', usersTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', principalsTableName: '<String>', createPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', createOrgPrincipalFunction: '<String>', deleteOrgPrincipalFunction: '<String>', createOrgApiKeyFunction: '<String>', revokeOrgApiKeyFunction: '<String>', apiName: '<String>' });
```
