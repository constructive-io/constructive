# orgLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
db.orgLimit.findMany({ select: { id: true } }).execute()
db.orgLimit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.orgLimit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimit records

```typescript
const items = await db.orgLimit.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a orgLimit

```typescript
const item = await db.orgLimit.create({
  data: { name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
