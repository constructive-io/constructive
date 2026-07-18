# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AgentModule data operations

## Usage

```typescript
useAgentModulesQuery({ selection: { fields: { agentTableId: true, agentTableName: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, hasAgents: true, hasPlans: true, hasResources: true, id: true, messageTableId: true, messageTableName: true, personaTableId: true, personaTableName: true, planTableId: true, planTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, promptsTableId: true, promptsTableName: true, provisions: true, publicSchemaName: true, resourceTableId: true, resourceTableName: true, resources: true, schemaId: true, scope: true, shared: true, taskTableId: true, taskTableName: true, threadTableId: true, threadTableName: true } } })
useAgentModuleQuery({ id: '<UUID>', selection: { fields: { agentTableId: true, agentTableName: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, hasAgents: true, hasPlans: true, hasResources: true, id: true, messageTableId: true, messageTableName: true, personaTableId: true, personaTableName: true, planTableId: true, planTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, promptsTableId: true, promptsTableName: true, provisions: true, publicSchemaName: true, resourceTableId: true, resourceTableName: true, resources: true, schemaId: true, scope: true, shared: true, taskTableId: true, taskTableName: true, threadTableId: true, threadTableName: true } } })
useCreateAgentModuleMutation({ selection: { fields: { id: true } } })
useUpdateAgentModuleMutation({ selection: { fields: { id: true } } })
useDeleteAgentModuleMutation({})
```

## Examples

### List all agentModules

```typescript
const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { agentTableId: true, agentTableName: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, hasAgents: true, hasPlans: true, hasResources: true, id: true, messageTableId: true, messageTableName: true, personaTableId: true, personaTableName: true, planTableId: true, planTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, promptsTableId: true, promptsTableName: true, provisions: true, publicSchemaName: true, resourceTableId: true, resourceTableName: true, resources: true, schemaId: true, scope: true, shared: true, taskTableId: true, taskTableName: true, threadTableId: true, threadTableName: true } },
});
```

### Create a agentModule

```typescript
const { mutate } = useCreateAgentModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ agentTableId: '<UUID>', agentTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasAgents: '<Boolean>', hasPlans: '<Boolean>', hasResources: '<Boolean>', messageTableId: '<UUID>', messageTableName: '<String>', personaTableId: '<UUID>', personaTableName: '<String>', planTableId: '<UUID>', planTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', promptsTableId: '<UUID>', promptsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceTableId: '<UUID>', resourceTableName: '<String>', resources: '<JSON>', schemaId: '<UUID>', scope: '<String>', shared: '<Boolean>', taskTableId: '<UUID>', taskTableName: '<String>', threadTableId: '<UUID>', threadTableName: '<String>' });
```
