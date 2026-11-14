# platformResourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourcesResolvedRequirement records

## Usage

```typescript
db.platformResourcesResolvedRequirement.findMany({ select: { id: true } }).execute()
db.platformResourcesResolvedRequirement.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourcesResolvedRequirement.update({ where: { id: '<UUID>' }, data: { atomId: '<UUID>' }, select: { id: true } }).execute()
db.platformResourcesResolvedRequirement.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourcesResolvedRequirement records

```typescript
const items = await db.platformResourcesResolvedRequirement.findMany({
  select: { id: true, atomId: true }
}).execute();
```
