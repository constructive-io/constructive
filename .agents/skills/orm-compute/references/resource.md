# resource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace

## Usage

```typescript
db.resource.findMany({ select: { id: true } }).execute()
db.resource.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resource.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' }, select: { id: true } }).execute()
db.resource.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.resource.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resource records

```typescript
const items = await db.resource.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a resource

```typescript
const item = await db.resource.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' },
  select: { id: true }
}).execute();
```
