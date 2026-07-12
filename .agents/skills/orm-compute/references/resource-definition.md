# resourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
db.resourceDefinition.findMany({ select: { id: true } }).execute()
db.resourceDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceDefinition.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>', databaseId: '<UUID>' }, select: { id: true } }).execute()
db.resourceDefinition.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.resourceDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceDefinition records

```typescript
const items = await db.resourceDefinition.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a resourceDefinition

```typescript
const item = await db.resourceDefinition.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>', databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
