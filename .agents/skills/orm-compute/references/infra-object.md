# infraObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
db.infraObject.findMany({ select: { id: true } }).execute()
db.infraObject.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraObject.create({ data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' }, select: { id: true } }).execute()
db.infraObject.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.infraObject.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraObject records

```typescript
const items = await db.infraObject.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a infraObject

```typescript
const item = await db.infraObject.create({
  data: { data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' },
  select: { id: true }
}).execute();
```
