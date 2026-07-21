# platformInfraRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
db.platformInfraRef.findMany({ select: { id: true } }).execute()
db.platformInfraRef.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInfraRef.create({ data: { commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.platformInfraRef.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.platformInfraRef.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInfraRef records

```typescript
const items = await db.platformInfraRef.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a platformInfraRef

```typescript
const item = await db.platformInfraRef.create({
  data: { commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
