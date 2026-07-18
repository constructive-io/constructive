# resourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourcesResolvedRequirement records

## Usage

```typescript
db.resourcesResolvedRequirement.findMany({ select: { id: true } }).execute()
db.resourcesResolvedRequirement.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourcesResolvedRequirement.create({ data: { atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' }, select: { id: true } }).execute()
db.resourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { atomId: '<UUID>' }, select: { id: true } }).execute()
db.resourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourcesResolvedRequirement records

```typescript
const items = await db.resourcesResolvedRequirement.findMany({
  select: { id: true, atomId: true }
}).execute();
```

### Create a resourcesResolvedRequirement

```typescript
const item = await db.resourcesResolvedRequirement.create({
  data: { atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' },
  select: { id: true }
}).execute();
```
