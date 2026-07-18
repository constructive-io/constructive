# resource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
db.resource.findMany({ select: { id: true } }).execute()
db.resource.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resource.create({ data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.resource.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.resource.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resource records

```typescript
const items = await db.resource.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a resource

```typescript
const item = await db.resource.create({
  data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
