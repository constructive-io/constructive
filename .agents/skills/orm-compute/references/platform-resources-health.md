# platformResourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourcesHealth records

## Usage

```typescript
db.platformResourcesHealth.findMany({ select: { id: true } }).execute()
db.platformResourcesHealth.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourcesHealth.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformResourcesHealth.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourcesHealth records

```typescript
const items = await db.platformResourcesHealth.findMany({
  select: { id: true, annotations: true }
}).execute();
```
