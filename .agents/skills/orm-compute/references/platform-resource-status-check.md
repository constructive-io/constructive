# platformResourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails)

## Usage

```typescript
db.platformResourceStatusCheck.findMany({ select: { id: true } }).execute()
db.platformResourceStatusCheck.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceStatusCheck.create({ data: { resourceId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' }, select: { id: true } }).execute()
db.platformResourceStatusCheck.update({ where: { id: '<UUID>' }, data: { resourceId: '<UUID>' }, select: { id: true } }).execute()
db.platformResourceStatusCheck.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceStatusCheck records

```typescript
const items = await db.platformResourceStatusCheck.findMany({
  select: { id: true, resourceId: true }
}).execute();
```

### Create a platformResourceStatusCheck

```typescript
const item = await db.platformResourceStatusCheck.create({
  data: { resourceId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' },
  select: { id: true }
}).execute();
```
