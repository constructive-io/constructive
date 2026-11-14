# resourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourcesHealth records

## Usage

```typescript
db.resourcesHealth.findMany({ select: { id: true } }).execute()
db.resourcesHealth.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourcesHealth.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.resourcesHealth.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourcesHealth records

```typescript
const items = await db.resourcesHealth.findMany({
  select: { id: true, annotations: true }
}).execute();
```
