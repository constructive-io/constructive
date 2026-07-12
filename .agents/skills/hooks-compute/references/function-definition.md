# functionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
useFunctionDefinitionsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true, databaseId: true } } })
useFunctionDefinitionQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true, databaseId: true } } })
useCreateFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDefinitionMutation({})
```

## Examples

### List all functionDefinitions

```typescript
const { data, isLoading } = useFunctionDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true, databaseId: true } },
});
```

### Create a functionDefinition

```typescript
const { mutate } = useCreateFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>', databaseId: '<UUID>' });
```
