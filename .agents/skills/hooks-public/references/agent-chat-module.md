# agentChatModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AgentChatModule data operations

## Usage

```typescript
useAgentChatModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, apiId: true, threadTableId: true, threadTableName: true, messageTableId: true, messageTableName: true, taskTableId: true, taskTableName: true, prefix: true } } })
useAgentChatModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, apiId: true, threadTableId: true, threadTableName: true, messageTableId: true, messageTableName: true, taskTableId: true, taskTableName: true, prefix: true } } })
useCreateAgentChatModuleMutation({ selection: { fields: { id: true } } })
useUpdateAgentChatModuleMutation({ selection: { fields: { id: true } } })
useDeleteAgentChatModuleMutation({})
```

## Examples

### List all agentChatModules

```typescript
const { data, isLoading } = useAgentChatModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, apiId: true, threadTableId: true, threadTableName: true, messageTableId: true, messageTableName: true, taskTableId: true, taskTableName: true, prefix: true } },
});
```

### Create a agentChatModule

```typescript
const { mutate } = useCreateAgentChatModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', apiId: '<UUID>', threadTableId: '<UUID>', threadTableName: '<String>', messageTableId: '<UUID>', messageTableName: '<String>', taskTableId: '<UUID>', taskTableName: '<String>', prefix: '<String>' });
```
