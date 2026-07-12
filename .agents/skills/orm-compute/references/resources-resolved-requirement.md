# resourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourcesResolvedRequirement records

## Usage

```typescript
db.resourcesResolvedRequirement.findMany({ select: { id: true } }).execute()
db.resourcesResolvedRequirement.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourcesResolvedRequirement.create({ data: { resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' }, select: { id: true } }).execute()
db.resourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute()
db.resourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourcesResolvedRequirement records

```typescript
const items = await db.resourcesResolvedRequirement.findMany({
  select: { id: true, resourceId: true }
}).execute();
```

### Create a resourcesResolvedRequirement

```typescript
const item = await db.resourcesResolvedRequirement.create({
  data: { resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' },
  select: { id: true }
}).execute();
```
