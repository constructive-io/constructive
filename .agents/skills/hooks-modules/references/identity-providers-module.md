# identityProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Entity-aware config row for the identity_providers_module, which provisions a per-database
     identity_providers table holding OAuth2 / OIDC (and future SAML) provider definitions.
     The scope column determines which internal_secrets_module table the rotate proc targets
     (app_secrets for app scope, platform_secrets for platform scope). When scope = database,
     the secrets table gets a database_id column.
     Scoping matrix:
       scope=app       → per-database flat, in-app admin manages
       scope=platform  → platform-wide, platform admin manages (generate:constructive)
       scope=database  → per-database infra, carries database_id

## Usage

```typescript
useIdentityProvidersModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useIdentityProvidersModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCreateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useUpdateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useDeleteIdentityProvidersModuleMutation({})
```

## Examples

### List all identityProvidersModules

```typescript
const { data, isLoading } = useIdentityProvidersModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});
```

### Create a identityProvidersModule

```typescript
const { mutate } = useCreateIdentityProvidersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```
