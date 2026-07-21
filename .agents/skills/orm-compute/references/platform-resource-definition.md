# platformResourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource definitions — templates for resource kinds declaring default spec and secret/config requirements

## Usage

```typescript
db.platformResourceDefinition.findMany({ select: { id: true } }).execute()
db.platformResourceDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceDefinition.create({ data: { annotations: '<JSON>', createdBy: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.platformResourceDefinition.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformResourceDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceDefinition records

```typescript
const items = await db.platformResourceDefinition.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformResourceDefinition

```typescript
const item = await db.platformResourceDefinition.create({
  data: { annotations: '<JSON>', createdBy: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
