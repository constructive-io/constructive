# webhookModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for WebhookModule data operations

## Usage

```typescript
useWebhookModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionInvocationModuleId: true, functionModuleId: true, id: true, infraSecretsModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, webhookEndpointsTableId: true, webhookEndpointsTableName: true, webhookEventsTableId: true, webhookEventsTableName: true } } })
useWebhookModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionInvocationModuleId: true, functionModuleId: true, id: true, infraSecretsModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, webhookEndpointsTableId: true, webhookEndpointsTableName: true, webhookEventsTableId: true, webhookEventsTableName: true } } })
useCreateWebhookModuleMutation({ selection: { fields: { id: true } } })
useUpdateWebhookModuleMutation({ selection: { fields: { id: true } } })
useDeleteWebhookModuleMutation({})
```

## Examples

### List all webhookModules

```typescript
const { data, isLoading } = useWebhookModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionInvocationModuleId: true, functionModuleId: true, id: true, infraSecretsModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, webhookEndpointsTableId: true, webhookEndpointsTableName: true, webhookEventsTableId: true, webhookEventsTableName: true } },
});
```

### Create a webhookModule

```typescript
const { mutate } = useCreateWebhookModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionInvocationModuleId: '<UUID>', functionModuleId: '<UUID>', infraSecretsModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', webhookEndpointsTableId: '<UUID>', webhookEndpointsTableName: '<String>', webhookEventsTableId: '<UUID>', webhookEventsTableName: '<String>' });
```
