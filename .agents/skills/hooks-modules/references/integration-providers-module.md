# integrationProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the integration_providers_module, which provisions a per-database
     integration_providers table holding branded, reusable service definitions.
     Integration providers act as a catalog of external services (e.g. Mailgun, Postgres)
     and list the canonical secret/config names required to use them.
     Other modules (function_module, resource_module) match the provider slug as a string.

## Usage

```typescript
useIntegrationProvidersModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } } })
useIntegrationProvidersModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } } })
useCreateIntegrationProvidersModuleMutation({ selection: { fields: { id: true } } })
useUpdateIntegrationProvidersModuleMutation({ selection: { fields: { id: true } } })
useDeleteIntegrationProvidersModuleMutation({})
```

## Examples

### List all integrationProvidersModules

```typescript
const { data, isLoading } = useIntegrationProvidersModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableId: true, tableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true } },
});
```

### Create a integrationProvidersModule

```typescript
const { mutate } = useCreateIntegrationProvidersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>' });
```
