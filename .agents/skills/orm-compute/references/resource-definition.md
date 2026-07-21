# resourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
db.resourceDefinition.findMany({ select: { id: true } }).execute()
db.resourceDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceDefinition.create({ data: { annotations: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.resourceDefinition.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.resourceDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceDefinition records

```typescript
const items = await db.resourceDefinition.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a resourceDefinition

```typescript
const item = await db.resourceDefinition.create({
  data: { annotations: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
