# platformResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
db.platformResource.findMany({ select: { id: true } }).execute()
db.platformResource.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResource.create({ data: { annotations: '<JSON>', createdBy: '<UUID>', errorCount: '<Int>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.platformResource.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformResource.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResource records

```typescript
const items = await db.platformResource.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformResource

```typescript
const item = await db.platformResource.create({
  data: { annotations: '<JSON>', createdBy: '<UUID>', errorCount: '<Int>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
