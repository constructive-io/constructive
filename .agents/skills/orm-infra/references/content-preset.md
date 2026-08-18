# contentPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Seed-content preset catalog (limit defaults, trust ladders, ...) — merkle-versioned head over the infra store

## Usage

```typescript
db.contentPreset.findMany({ select: { id: true } }).execute()
db.contentPreset.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.contentPreset.create({ data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', kind: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.contentPreset.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute()
db.contentPreset.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all contentPreset records

```typescript
const items = await db.contentPreset.findMany({
  select: { id: true, active: true }
}).execute();
```

### Create a contentPreset

```typescript
const item = await db.contentPreset.create({
  data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', kind: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
