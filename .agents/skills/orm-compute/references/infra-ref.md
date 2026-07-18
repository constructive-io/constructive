# infraRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
db.infraRef.findMany({ select: { id: true } }).execute()
db.infraRef.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraRef.create({ data: { commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.infraRef.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.infraRef.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraRef records

```typescript
const items = await db.infraRef.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a infraRef

```typescript
const item = await db.infraRef.create({
  data: { commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
