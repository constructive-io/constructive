# resourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourcesHealth records

## Usage

```typescript
db.resourcesHealth.findMany({ select: { id: true } }).execute()
db.resourcesHealth.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourcesHealth.create({ data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.resourcesHealth.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.resourcesHealth.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourcesHealth records

```typescript
const items = await db.resourcesHealth.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a resourcesHealth

```typescript
const item = await db.resourcesHealth.create({
  data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
