# functionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
useFunctionDefinitionsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isInvocable: true, maxAttempts: true, priority: true, queueName: true, runtime: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } } })
useFunctionDefinitionQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isInvocable: true, maxAttempts: true, priority: true, queueName: true, runtime: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } } })
useCreateFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDefinitionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDefinitionMutation({})
```

## Examples

### List all functionDefinitions

```typescript
const { data, isLoading } = useFunctionDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isInvocable: true, maxAttempts: true, priority: true, queueName: true, runtime: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } },
});
```

### Create a functionDefinition

```typescript
const { mutate } = useCreateFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isInvocable: '<Boolean>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<FunctionRequirement>', requiredConfigs: '<FunctionRequirement>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' });
```
