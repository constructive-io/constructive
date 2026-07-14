# platformFunctionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
usePlatformFunctionDefinitionsQuery({ selection: { fields: { accessChannels: true, category: true, concurrency: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } } })
usePlatformFunctionDefinitionQuery({ id: '<UUID>', selection: { fields: { accessChannels: true, category: true, concurrency: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } } })
useCreatePlatformFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionDefinitionMutation({})
```

## Examples

### List all platformFunctionDefinitions

```typescript
const { data, isLoading } = usePlatformFunctionDefinitionsQuery({
  selection: { fields: { accessChannels: true, category: true, concurrency: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } },
});
```

### Create a platformFunctionDefinition

```typescript
const { mutate } = useCreatePlatformFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ accessChannels: '<String>', category: '<String>', concurrency: '<Int>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' });
```
