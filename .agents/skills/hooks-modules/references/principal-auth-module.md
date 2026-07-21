# principalAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions the principals subsystem: a principals table, a principal_entities junction table, create/delete mutations, and org API key management. Supports both human-owned principals (AuthzDirectOwner, AuthzHumanOnly) and org-owned principals (AuthzEntityMembership with is_admin). Org principal and org API key functions are only generated when an org-scoped memberships_module exists for the database.

## Usage

```typescript
usePrincipalAuthModulesQuery({ selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } } })
usePrincipalAuthModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } } })
useCreatePrincipalAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalAuthModuleMutation({ selection: { fields: { id: true } } })
useDeletePrincipalAuthModuleMutation({})
```

## Examples

### List all principalAuthModules

```typescript
const { data, isLoading } = usePrincipalAuthModulesQuery({
  selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } },
});
```

### Create a principalAuthModule

```typescript
const { mutate } = useCreatePrincipalAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' });
```
