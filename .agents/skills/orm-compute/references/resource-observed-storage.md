# resourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceObservedStorage records

## Usage

```typescript
db.resourceObservedStorage.findMany({ select: { id: true } }).execute()
db.resourceObservedStorage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceObservedStorage.update({ where: { id: '<UUID>' }, data: { capacity: '<String>' }, select: { id: true } }).execute()
db.resourceObservedStorage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceObservedStorage records

```typescript
const items = await db.resourceObservedStorage.findMany({
  select: { id: true, capacity: true }
}).execute();
```
