# platformResourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
db.platformResourceDefinition.findMany({ select: { id: true } }).execute()
db.platformResourceDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceDefinition.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>' }, select: { id: true } }).execute()
db.platformResourceDefinition.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.platformResourceDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceDefinition records

```typescript
const items = await db.platformResourceDefinition.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a platformResourceDefinition

```typescript
const item = await db.platformResourceDefinition.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>' },
  select: { id: true }
}).execute();
```
