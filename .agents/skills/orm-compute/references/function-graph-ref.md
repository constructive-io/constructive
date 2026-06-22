# functionGraphRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
db.functionGraphRef.findMany({ select: { id: true } }).execute()
db.functionGraphRef.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphRef.create({ data: { name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' }, select: { id: true } }).execute()
db.functionGraphRef.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.functionGraphRef.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphRef records

```typescript
const items = await db.functionGraphRef.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a functionGraphRef

```typescript
const item = await db.functionGraphRef.create({
  data: { name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' },
  select: { id: true }
}).execute();
```
