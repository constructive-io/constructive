# integrationProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string.

## Usage

```typescript
useIntegrationProvidersModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useIntegrationProvidersModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } } })
useCreateIntegrationProvidersModuleMutation({ selection: { fields: { id: true } } })
useUpdateIntegrationProvidersModuleMutation({ selection: { fields: { id: true } } })
useDeleteIntegrationProvidersModuleMutation({})
```

## Examples

### List all integrationProvidersModules

```typescript
const { data, isLoading } = useIntegrationProvidersModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, tableId: true, tableName: true } },
});
```

### Create a integrationProvidersModule

```typescript
const { mutate } = useCreateIntegrationProvidersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' });
```
