# platformFunctionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
db.platformFunctionDefinition.findMany({ select: { id: true } }).execute()
db.platformFunctionDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionDefinition.create({ data: { scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' }, select: { id: true } }).execute()
db.platformFunctionDefinition.update({ where: { id: '<UUID>' }, data: { scope: '<String>' }, select: { id: true } }).execute()
db.platformFunctionDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionDefinition records

```typescript
const items = await db.platformFunctionDefinition.findMany({
  select: { id: true, scope: true }
}).execute();
```

### Create a platformFunctionDefinition

```typescript
const item = await db.platformFunctionDefinition.create({
  data: { scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' },
  select: { id: true }
}).execute();
```
