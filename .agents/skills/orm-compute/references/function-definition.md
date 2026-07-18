# functionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
db.functionDefinition.findMany({ select: { id: true } }).execute()
db.functionDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDefinition.create({ data: { accessChannels: '<String>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', databaseId: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' }, select: { id: true } }).execute()
db.functionDefinition.update({ where: { id: '<UUID>' }, data: { accessChannels: '<String>' }, select: { id: true } }).execute()
db.functionDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDefinition records

```typescript
const items = await db.functionDefinition.findMany({
  select: { id: true, accessChannels: true }
}).execute();
```

### Create a functionDefinition

```typescript
const item = await db.functionDefinition.create({
  data: { accessChannels: '<String>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', databaseId: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' },
  select: { id: true }
}).execute();
```
