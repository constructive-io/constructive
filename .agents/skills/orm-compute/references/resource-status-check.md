# resourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails)

## Usage

```typescript
db.resourceStatusCheck.findMany({ select: { id: true } }).execute()
db.resourceStatusCheck.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceStatusCheck.create({ data: { completedAt: '<Datetime>', databaseId: '<UUID>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' }, select: { id: true } }).execute()
db.resourceStatusCheck.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute()
db.resourceStatusCheck.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceStatusCheck records

```typescript
const items = await db.resourceStatusCheck.findMany({
  select: { id: true, completedAt: true }
}).execute();
```

### Create a resourceStatusCheck

```typescript
const item = await db.resourceStatusCheck.create({
  data: { completedAt: '<Datetime>', databaseId: '<UUID>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' },
  select: { id: true }
}).execute();
```
