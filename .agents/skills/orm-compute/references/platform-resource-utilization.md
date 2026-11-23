# platformResourceUtilization

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourceUtilization records

## Usage

```typescript
db.platformResourceUtilization.findMany({ select: { id: true } }).execute()
db.platformResourceUtilization.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceUtilization.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute()
db.platformResourceUtilization.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceUtilization records

```typescript
const items = await db.platformResourceUtilization.findMany({
  select: { id: true, avgMemoryBytes: true }
}).execute();
```
