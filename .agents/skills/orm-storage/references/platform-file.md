# platformFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Individual file records within buckets, with immutable identity fields and mutable metadata

## Usage

```typescript
db.platformFile.findMany({ select: { id: true } }).execute()
db.platformFile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFile.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformFile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFile records

```typescript
const items = await db.platformFile.findMany({
  select: { id: true, actorId: true }
}).execute();
```
