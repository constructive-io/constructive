# identityProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which config_secrets_module table the rotate proc targets
     (app_secrets for app scope, org_secrets for org scope). When scope = platform,
     the secrets table gets a database_id column and platform-level RLS via
     AuthzRelatedEntityMembership through database.owner_id.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → per-database, platform admin manages (generate:constructive)
       scope=org       → per-org tenant, org admin manages

## Usage

```typescript
useIdentityProvidersModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } } })
useIdentityProvidersModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } } })
useCreateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useUpdateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useDeleteIdentityProvidersModuleMutation({})
```

## Examples

### List all identityProvidersModules

```typescript
const { data, isLoading } = useIdentityProvidersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } },
});
```

### Create a identityProvidersModule

```typescript
const { mutate } = useCreateIdentityProvidersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' });
```
