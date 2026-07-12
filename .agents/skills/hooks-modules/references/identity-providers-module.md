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
useIdentityProvidersModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } } })
useIdentityProvidersModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } } })
useCreateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useUpdateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useDeleteIdentityProvidersModuleMutation({})
```

## Examples

### List all identityProvidersModules

```typescript
const { data, isLoading } = useIdentityProvidersModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } },
});
```

### Create a identityProvidersModule

```typescript
const { mutate } = useCreateIdentityProvidersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' });
```
