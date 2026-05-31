# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AgentModule data operations

## Usage

```typescript
useAgentModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, knowledgeTableId: true, planTableId: true, skillTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, knowledgeTableName: true, planTableName: true, skillTableName: true, hasKnowledge: true, hasPlans: true, hasSkills: true, apiName: true, privateApiName: true, scope: true, databaseOwned: true, prefix: true, entityTableId: true, policies: true, knowledgeConfig: true, skillsConfig: true, knowledgePolicies: true, provisions: true } } })
useAgentModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, knowledgeTableId: true, planTableId: true, skillTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, knowledgeTableName: true, planTableName: true, skillTableName: true, hasKnowledge: true, hasPlans: true, hasSkills: true, apiName: true, privateApiName: true, scope: true, databaseOwned: true, prefix: true, entityTableId: true, policies: true, knowledgeConfig: true, skillsConfig: true, knowledgePolicies: true, provisions: true } } })
useCreateAgentModuleMutation({ selection: { fields: { id: true } } })
useUpdateAgentModuleMutation({ selection: { fields: { id: true } } })
useDeleteAgentModuleMutation({})
```

## Examples

### List all agentModules

```typescript
const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, knowledgeTableId: true, planTableId: true, skillTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, knowledgeTableName: true, planTableName: true, skillTableName: true, hasKnowledge: true, hasPlans: true, hasSkills: true, apiName: true, privateApiName: true, scope: true, databaseOwned: true, prefix: true, entityTableId: true, policies: true, knowledgeConfig: true, skillsConfig: true, knowledgePolicies: true, provisions: true } },
});
```

### Create a agentModule

```typescript
const { mutate } = useCreateAgentModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', knowledgeTableId: '<UUID>', planTableId: '<UUID>', skillTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', knowledgeTableName: '<String>', planTableName: '<String>', skillTableName: '<String>', hasKnowledge: '<Boolean>', hasPlans: '<Boolean>', hasSkills: '<Boolean>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', databaseOwned: '<Boolean>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', knowledgeConfig: '<JSON>', skillsConfig: '<JSON>', knowledgePolicies: '<JSON>', provisions: '<JSON>' });
```
