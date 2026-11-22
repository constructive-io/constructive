# principalsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions principals as authorization data, with no dependency on sessions or sign-in: the principals, principal_entities and principal_scope_overrides tables, the create/update/delete and scope mutations, the SPRT derivation that keeps a principal's capabilities in step with its owner, and the expiry sweep. The caller that opens the transaction sets jwt.claims.principal_id to a principal's user_id. Credentials for principals (API keys, child sessions, token exchange) are principal_auth_module, which builds on this one.

## Usage

```typescript
usePrincipalsModulesQuery({ selection: { fields: { createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, privateSchemaId: true, schemaId: true, sweepExpiredPrincipalsFunction: true, usersTableId: true } } })
usePrincipalsModuleQuery({ id: '<UUID>', selection: { fields: { createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, privateSchemaId: true, schemaId: true, sweepExpiredPrincipalsFunction: true, usersTableId: true } } })
useCreatePrincipalsModuleMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalsModuleMutation({ selection: { fields: { id: true } } })
useDeletePrincipalsModuleMutation({})
```

## Examples

### List all principalsModules

```typescript
const { data, isLoading } = usePrincipalsModulesQuery({
  selection: { fields: { createOrgPrincipalFunction: true, createPrincipalFunction: true, databaseId: true, deleteOrgPrincipalFunction: true, deletePrincipalFunction: true, id: true, principalEntitiesTableId: true, principalScopeOverridesTableId: true, principalsTableId: true, principalsTableName: true, privateSchemaId: true, schemaId: true, sweepExpiredPrincipalsFunction: true, usersTableId: true } },
});
```

### Create a principalsModule

```typescript
const { mutate } = useCreatePrincipalsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ createOrgPrincipalFunction: '<String>', createPrincipalFunction: '<String>', databaseId: '<UUID>', deleteOrgPrincipalFunction: '<String>', deletePrincipalFunction: '<String>', principalEntitiesTableId: '<UUID>', principalScopeOverridesTableId: '<UUID>', principalsTableId: '<UUID>', principalsTableName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sweepExpiredPrincipalsFunction: '<String>', usersTableId: '<UUID>' });
```
