# principalAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions credentials for principals on top of principals_module: API keys, child sessions, delegation and token exchange, and org API key management. Requires the built-in auth stack (sessions_module, user_auth_module); installing it provisions principals_module first when the database does not have it. Org API key functions are only generated when an org-scoped memberships_module exists for the database.

## Usage

```typescript
usePrincipalAuthModulesQuery({ selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, privateSchemaId: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, sweepExpiredPrincipalsFunction: true, usersTableId: true } } })
usePrincipalAuthModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, privateSchemaId: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, sweepExpiredPrincipalsFunction: true, usersTableId: true } } })
useCreatePrincipalAuthModuleMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalAuthModuleMutation({ selection: { fields: { id: true } } })
useDeletePrincipalAuthModuleMutation({})
```

## Examples

### List all principalAuthModules

```typescript
const { data, isLoading } = usePrincipalAuthModulesQuery({
  selection: { fields: { apiName: true, auditsTableId: true, createOrgApiKeyFunction: true, createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, privateSchemaId: true, revokeOrgApiKeyFunction: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, sweepExpiredPrincipalsFunction: true, usersTableId: true } },
});
```

### Create a principalAuthModule

```typescript
const { mutate } = useCreatePrincipalAuthModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', auditsTableId: '<UUID>', createOrgApiKeyFunction: '<String>', createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', privateSchemaId: '<UUID>', revokeOrgApiKeyFunction: '<String>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', sweepExpiredPrincipalsFunction: '<String>', usersTableId: '<UUID>' });
```
