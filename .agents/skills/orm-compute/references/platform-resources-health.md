# platformResourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourcesHealth records

## Usage

```typescript
db.platformResourcesHealth.findMany({ select: { id: true } }).execute()
db.platformResourcesHealth.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourcesHealth.create({ data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.platformResourcesHealth.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformResourcesHealth.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourcesHealth records

```typescript
const items = await db.platformResourcesHealth.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformResourcesHealth

```typescript
const item = await db.platformResourcesHealth.create({
  data: { annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
