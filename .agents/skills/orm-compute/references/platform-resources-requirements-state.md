# platformResourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourcesRequirementsState records

## Usage

```typescript
db.platformResourcesRequirementsState.findMany({ select: { id: true } }).execute()
db.platformResourcesRequirementsState.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourcesRequirementsState.update({ where: { id: '<UUID>' }, data: { configHash: '<String>' }, select: { id: true } }).execute()
db.platformResourcesRequirementsState.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourcesRequirementsState records

```typescript
const items = await db.platformResourcesRequirementsState.findMany({
  select: { id: true, configHash: true }
}).execute();
```
