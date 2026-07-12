# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AgentModule data operations

## Usage

```typescript
useAgentModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, planTableId: true, agentTableId: true, personaTableId: true, resourceTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, planTableName: true, agentTableName: true, personaTableName: true, resourceTableName: true, hasPlans: true, hasResources: true, hasAgents: true, shared: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, resources: true, provisions: true, defaultPermissions: true } } })
useAgentModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, planTableId: true, agentTableId: true, personaTableId: true, resourceTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, planTableName: true, agentTableName: true, personaTableName: true, resourceTableName: true, hasPlans: true, hasResources: true, hasAgents: true, shared: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, resources: true, provisions: true, defaultPermissions: true } } })
useCreateAgentModuleMutation({ selection: { fields: { id: true } } })
useUpdateAgentModuleMutation({ selection: { fields: { id: true } } })
useDeleteAgentModuleMutation({})
```

## Examples

### List all agentModules

```typescript
const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, planTableId: true, agentTableId: true, personaTableId: true, resourceTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, planTableName: true, agentTableName: true, personaTableName: true, resourceTableName: true, hasPlans: true, hasResources: true, hasAgents: true, shared: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, resources: true, provisions: true, defaultPermissions: true } },
});
```

### Create a agentModule

```typescript
const { mutate } = useCreateAgentModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', planTableId: '<UUID>', agentTableId: '<UUID>', personaTableId: '<UUID>', resourceTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', planTableName: '<String>', agentTableName: '<String>', personaTableName: '<String>', resourceTableName: '<String>', hasPlans: '<Boolean>', hasResources: '<Boolean>', hasAgents: '<Boolean>', shared: '<Boolean>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', resources: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
