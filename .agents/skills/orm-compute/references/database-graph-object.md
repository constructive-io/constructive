# databaseGraphObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
db.databaseGraphObject.findMany({ select: { id: true } }).execute()
db.databaseGraphObject.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseGraphObject.create({ data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' }, select: { id: true } }).execute()
db.databaseGraphObject.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.databaseGraphObject.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseGraphObject records

```typescript
const items = await db.databaseGraphObject.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a databaseGraphObject

```typescript
const item = await db.databaseGraphObject.create({
  data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' },
  select: { id: true }
}).execute();
```
