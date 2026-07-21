# resourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourcesRequirementsState records

## Usage

```typescript
db.resourcesRequirementsState.findMany({ select: { id: true } }).execute()
db.resourcesRequirementsState.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourcesRequirementsState.create({ data: { configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' }, select: { id: true } }).execute()
db.resourcesRequirementsState.update({ where: { id: '<UUID>' }, data: { configHash: '<String>' }, select: { id: true } }).execute()
db.resourcesRequirementsState.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourcesRequirementsState records

```typescript
const items = await db.resourcesRequirementsState.findMany({
  select: { id: true, configHash: true }
}).execute();
```

### Create a resourcesRequirementsState

```typescript
const item = await db.resourcesRequirementsState.create({
  data: { configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' },
  select: { id: true }
}).execute();
```
