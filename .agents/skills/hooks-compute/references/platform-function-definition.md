# platformFunctionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
usePlatformFunctionDefinitionsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } } })
usePlatformFunctionDefinitionQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } } })
useCreatePlatformFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionDefinitionMutation({})
```

## Examples

### List all platformFunctionDefinitions

```typescript
const { data, isLoading } = usePlatformFunctionDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } },
});
```

### Create a platformFunctionDefinition

```typescript
const { mutate } = useCreatePlatformFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' });
```
