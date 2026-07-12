# platformResourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourcesResolvedRequirement records

## Usage

```typescript
db.platformResourcesResolvedRequirement.findMany({ select: { id: true } }).execute()
db.platformResourcesResolvedRequirement.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourcesResolvedRequirement.create({ data: { resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' }, select: { id: true } }).execute()
db.platformResourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute()
db.platformResourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourcesResolvedRequirement records

```typescript
const items = await db.platformResourcesResolvedRequirement.findMany({
  select: { id: true, resourceId: true }
}).execute();
```

### Create a platformResourcesResolvedRequirement

```typescript
const item = await db.platformResourcesResolvedRequirement.create({
  data: { resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' },
  select: { id: true }
}).execute();
```
