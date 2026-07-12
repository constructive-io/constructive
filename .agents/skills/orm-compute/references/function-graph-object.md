# functionGraphObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
db.functionGraphObject.findMany({ select: { id: true } }).execute()
db.functionGraphObject.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphObject.create({ data: { scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' }, select: { id: true } }).execute()
db.functionGraphObject.update({ where: { id: '<UUID>' }, data: { scopeId: '<UUID>' }, select: { id: true } }).execute()
db.functionGraphObject.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphObject records

```typescript
const items = await db.functionGraphObject.findMany({
  select: { id: true, scopeId: true }
}).execute();
```

### Create a functionGraphObject

```typescript
const item = await db.functionGraphObject.create({
  data: { scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' },
  select: { id: true }
}).execute();
```
