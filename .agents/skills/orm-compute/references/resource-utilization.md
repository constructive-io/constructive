# resourceUtilization

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceUtilization records

## Usage

```typescript
db.resourceUtilization.findMany({ select: { id: true } }).execute()
db.resourceUtilization.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceUtilization.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute()
db.resourceUtilization.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceUtilization records

```typescript
const items = await db.resourceUtilization.findMany({
  select: { id: true, avgMemoryBytes: true }
}).execute();
```
