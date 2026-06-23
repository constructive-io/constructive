# functionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
db.functionDefinition.findMany({ select: { id: true } }).execute()
db.functionDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDefinition.create({ data: { scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isInvocable: '<Boolean>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<FunctionRequirement>', requiredConfigs: '<FunctionRequirement>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' }, select: { id: true } }).execute()
db.functionDefinition.update({ where: { id: '<UUID>' }, data: { scope: '<String>' }, select: { id: true } }).execute()
db.functionDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDefinition records

```typescript
const items = await db.functionDefinition.findMany({
  select: { id: true, scope: true }
}).execute();
```

### Create a functionDefinition

```typescript
const item = await db.functionDefinition.create({
  data: { scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isInvocable: '<Boolean>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<FunctionRequirement>', requiredConfigs: '<FunctionRequirement>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' },
  select: { id: true }
}).execute();
```
