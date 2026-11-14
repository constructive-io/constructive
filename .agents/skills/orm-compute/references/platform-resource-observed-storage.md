# platformResourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourceObservedStorage records

## Usage

```typescript
db.platformResourceObservedStorage.findMany({ select: { id: true } }).execute()
db.platformResourceObservedStorage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceObservedStorage.update({ where: { id: '<UUID>' }, data: { capacity: '<String>' }, select: { id: true } }).execute()
db.platformResourceObservedStorage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceObservedStorage records

```typescript
const items = await db.platformResourceObservedStorage.findMany({
  select: { id: true, capacity: true }
}).execute();
```
