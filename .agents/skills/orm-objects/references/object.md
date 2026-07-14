# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
db.object.findMany({ select: { id: true } }).execute()
db.object.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.object.create({ data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' }, select: { id: true } }).execute()
db.object.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.object.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all object records

```typescript
const items = await db.object.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a object

```typescript
const item = await db.object.create({
  data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' },
  select: { id: true }
}).execute();
```
