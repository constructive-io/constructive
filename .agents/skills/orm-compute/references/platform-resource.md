# platformResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
db.platformResource.findMany({ select: { id: true } }).execute()
db.platformResource.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResource.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' }, select: { id: true } }).execute()
db.platformResource.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.platformResource.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResource records

```typescript
const items = await db.platformResource.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a platformResource

```typescript
const item = await db.platformResource.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' },
  select: { id: true }
}).execute();
```
