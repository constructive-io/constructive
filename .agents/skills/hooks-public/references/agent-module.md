# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AgentModule data operations

## Usage

```typescript
useAgentModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, knowledgeTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, knowledgeTableName: true, hasKnowledge: true, apiName: true, membershipType: true, key: true, entityTableId: true, policies: true, knowledgeConfig: true, knowledgePolicies: true, provisions: true } } })
useAgentModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, knowledgeTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, knowledgeTableName: true, hasKnowledge: true, apiName: true, membershipType: true, key: true, entityTableId: true, policies: true, knowledgeConfig: true, knowledgePolicies: true, provisions: true } } })
useCreateAgentModuleMutation({ selection: { fields: { id: true } } })
useUpdateAgentModuleMutation({ selection: { fields: { id: true } } })
useDeleteAgentModuleMutation({})
```

## Examples

### List all agentModules

```typescript
const { data, isLoading } = useAgentModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, threadTableId: true, messageTableId: true, taskTableId: true, promptsTableId: true, knowledgeTableId: true, threadTableName: true, messageTableName: true, taskTableName: true, promptsTableName: true, knowledgeTableName: true, hasKnowledge: true, apiName: true, membershipType: true, key: true, entityTableId: true, policies: true, knowledgeConfig: true, knowledgePolicies: true, provisions: true } },
});
```

### Create a agentModule

```typescript
const { mutate } = useCreateAgentModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', knowledgeTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', knowledgeTableName: '<String>', hasKnowledge: '<Boolean>', apiName: '<String>', membershipType: '<Int>', key: '<String>', entityTableId: '<UUID>', policies: '<JSON>', knowledgeConfig: '<JSON>', knowledgePolicies: '<JSON>', provisions: '<JSON>' });
```
