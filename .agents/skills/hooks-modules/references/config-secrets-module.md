# configSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Entity-aware PGP-encrypted key-value config/secrets module. Supports app-level (admin-only)
     and org-scoped (per-org secrets with manage_secrets permission) via the scope column.
     User-scoped bcrypt credentials are handled by user_credentials_module.

## Usage

```typescript
useConfigSecretsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, configDefinitionsTableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, hasConfig: true } } })
useConfigSecretsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, configDefinitionsTableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, hasConfig: true } } })
useCreateConfigSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateConfigSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteConfigSecretsModuleMutation({})
```

## Examples

### List all configSecretsModules

```typescript
const { data, isLoading } = useConfigSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, configDefinitionsTableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, hasConfig: true } },
});
```

### Create a configSecretsModule

```typescript
const { mutate } = useCreateConfigSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', configDefinitionsTableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', hasConfig: '<Boolean>' });
```
