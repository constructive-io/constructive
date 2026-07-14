# functionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
useFunctionDefinitionsQuery({ selection: { fields: { accessChannels: true, category: true, concurrency: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } } })
useFunctionDefinitionQuery({ id: '<UUID>', selection: { fields: { accessChannels: true, category: true, concurrency: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } } })
useCreateFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDefinitionMutation({})
```

## Examples

### List all functionDefinitions

```typescript
const { data, isLoading } = useFunctionDefinitionsQuery({
  selection: { fields: { accessChannels: true, category: true, concurrency: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } },
});
```

### Create a functionDefinition

```typescript
const { mutate } = useCreateFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ accessChannels: '<String>', category: '<String>', concurrency: '<Int>', databaseId: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' });
```
