# platformInfraStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
db.platformInfraStore.findMany({ select: { id: true } }).execute()
db.platformInfraStore.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInfraStore.create({ data: { hash: '<UUID>', name: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute()
db.platformInfraStore.update({ where: { id: '<UUID>' }, data: { hash: '<UUID>' }, select: { id: true } }).execute()
db.platformInfraStore.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInfraStore records

```typescript
const items = await db.platformInfraStore.findMany({
  select: { id: true, hash: true }
}).execute();
```

### Create a platformInfraStore

```typescript
const item = await db.platformInfraStore.create({
  data: { hash: '<UUID>', name: '<String>', scopeId: '<UUID>' },
  select: { id: true }
}).execute();
```
