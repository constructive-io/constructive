# platformFunctionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function definitions — registered cloud functions with routing, queue, and retry configuration

## Usage

```typescript
db.platformFunctionDefinition.findMany({ select: { id: true } }).execute()
db.platformFunctionDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionDefinition.create({ data: { accessChannels: '<String>', anonymousCallable: '<Boolean>', billable: '<Boolean>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdByPrincipal: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredCapabilities: '<JSON>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredModules: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', system: '<Boolean>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', updatedByPrincipal: '<UUID>', volatile: '<Boolean>' }, select: { id: true } }).execute()
db.platformFunctionDefinition.update({ where: { id: '<UUID>' }, data: { accessChannels: '<String>' }, select: { id: true } }).execute()
db.platformFunctionDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionDefinition records

```typescript
const items = await db.platformFunctionDefinition.findMany({
  select: { id: true, accessChannels: true }
}).execute();
```

### Create a platformFunctionDefinition

```typescript
const item = await db.platformFunctionDefinition.create({
  data: { accessChannels: '<String>', anonymousCallable: '<Boolean>', billable: '<Boolean>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdByPrincipal: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredCapabilities: '<JSON>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredModules: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', system: '<Boolean>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', updatedByPrincipal: '<UUID>', volatile: '<Boolean>' },
  select: { id: true }
}).execute();
```
